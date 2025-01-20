using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
//using TimeTravelAgency.Application.Data;
using TimeTravelAgency.Application.Infrastructure;
using TimeTravelAgency.Application.Model;
using Xunit;

namespace TimeTravelAgency.Test;

public class DatabaseTests
{
    private readonly DbContextOptions<TimeTravelAgencyContext> _dbContextOptions;

    public DatabaseTests()
    {
        _dbContextOptions = new DbContextOptionsBuilder<TimeTravelAgencyContext>()
            .UseSqlite("Data Source=TimeTravelAgencyTest.db")
            .Options;
        
        using var context = new TimeTravelAgencyContext(_dbContextOptions);
        context.Database.EnsureDeleted();
        context.Database.EnsureCreated();
    }
    
    
    // General

    [Fact]
    public async Task Database_SetUpDemoDataForEveryTable()
    {
        await using var context = new TimeTravelAgencyContext(_dbContextOptions);
        await context.Database.EnsureDeletedAsync();
        await context.Database.EnsureCreatedAsync();
        
        // Managers
        var manager1 = new Manager("Jane", "Doe", "jane@doe.com", "+4367762698232");
        var manager2 = new Manager("Justus", "Doe", "justus@doe.com", "+4367762698232");
        var manager3 = new Manager("Jessica", "Doe", "jessica@doe.com", "+4367762698232");
        
        context.Managers.Add(manager1);
        context.Managers.Add(manager2);
        context.Managers.Add(manager3);
        
        await context.SaveChangesAsync();

        // Agents
        var agent1 = new Agent("Alice", "Smith", DateTime.Now.AddYears(-25), 2025);
        var agent2 = new Agent("Anton", "Smith", DateTime.Now.AddYears(-25), 2025);
        var agent3 = new Agent("Alex", "Smith", DateTime.Now.AddYears(-25), 2025);
        
        context.Agents.Add(agent1);
        context.Agents.Add(agent2);
        context.Agents.Add(agent3);
        
        await context.SaveChangesAsync();
        
        // LicensedAgents
        var licensedAgent1 = new LicensedAgent("James", "Bond", DateTime.Now.AddYears(-40), 1940, 007, DateTime.Now.AddYears(3));
        var licensedAgent2 = new LicensedAgent("Judith", "Bond", DateTime.Now.AddYears(-40), 1940, 007, DateTime.Now.AddYears(3));
        var licensedAgent3 = new LicensedAgent("Jasmin", "Bond", DateTime.Now.AddYears(-40), 1940, 007, DateTime.Now.AddYears(3));
        
        context.LicensedAgents.Add(licensedAgent1);
        context.LicensedAgents.Add(licensedAgent2);
        context.LicensedAgents.Add(licensedAgent3);
        
        await context.SaveChangesAsync();
        
        // Assign Agents to Managers
        
        licensedAgent1.AssignAgentToManager(manager1);
        licensedAgent2.AssignAgentToManager(manager2);
        licensedAgent3.AssignAgentToManager(manager3);
        
        agent1.AssignAgentToManager(manager1);
        agent2.AssignAgentToManager(manager2);
        agent3.AssignAgentToManager(manager3);
        
        await context.SaveChangesAsync();
        
        // Customers
        var customer1 = new Customer("Karin", "Clause", "karin@clause.com", "1234567890", DateTime.Now.AddYears(-21));
        var customer2 = new Customer("Kevin", "Clause", "Kevin@clause.com", "1234567890", DateTime.Now.AddYears(-21));
        var customer3 = new Customer("Katherina", "Clause", "Katherina@clause.com", "1234567890", DateTime.Now.AddYears(-21));
        context.Customers.Add(customer1);
        context.Customers.Add(customer2);
        context.Customers.Add(customer3);
        
        await context.SaveChangesAsync();
        
        // Trips
        var trip00 = manager1.CreateTrip(DateTime.Now.AddSeconds(5), licensedAgent1, "Trip 00");
        
        var trip11 = manager1.CreateTrip(DateTime.Now.AddDays(11), licensedAgent1, "Trip 11");
        var trip12 = manager1.CreateTrip(DateTime.Now.AddDays(12), licensedAgent2, "Trip 12");
        var trip13 = manager1.CreateTrip(DateTime.Now.AddDays(13), licensedAgent3, "Trip 13");
        
        var trip21 = manager2.CreateTrip(DateTime.Now.AddDays(21), licensedAgent1, "Trip 21");
        var trip22 = manager2.CreateTrip(DateTime.Now.AddDays(22), licensedAgent2, "Trip 22");
        var trip23 = manager2.CreateTrip(DateTime.Now.AddDays(23), licensedAgent3, "Trip 23");
        
        var trip31 = manager3.CreateTrip(DateTime.Now.AddDays(31), licensedAgent1, "Trip 31");
        var trip32 = manager3.CreateTrip(DateTime.Now.AddDays(32), licensedAgent2, "Trip 32");
        var trip33 = manager3.CreateTrip(DateTime.Now.AddDays(33), licensedAgent3, "Trip 33");
        
        context.Trips.Add(trip00);
        
        context.Trips.Add(trip11);
        context.Trips.Add(trip12);
        context.Trips.Add(trip13);
        
        context.Trips.Add(trip21);
        context.Trips.Add(trip22);
        context.Trips.Add(trip23);
        
        context.Trips.Add(trip31);
        context.Trips.Add(trip32);
        context.Trips.Add(trip33);
        
        await context.SaveChangesAsync();
        
        // Assign Customers to Trips
        customer1.AssignToTrip(trip00);
        customer2.AssignToTrip(trip00);
        customer3.AssignToTrip(trip00);
        
        customer1.AssignToTrip(trip11);
        customer2.AssignToTrip(trip11);
        
        customer3.AssignToTrip(trip12);
        customer1.AssignToTrip(trip12);
        
        customer2.AssignToTrip(trip13);
        customer3.AssignToTrip(trip13);
        
        customer1.AssignToTrip(trip21);
        customer2.AssignToTrip(trip22);
        customer3.AssignToTrip(trip23);
        
        customer1.AssignToTrip(trip33);
        customer2.AssignToTrip(trip32);
        customer3.AssignToTrip(trip31);
        
        await context.SaveChangesAsync();
        
        // Assign Agents to Trips
        manager1.AddAgentToTrip(agent1, trip00);
        manager2.AddAgentToTrip(agent2, trip21);
        manager3.AddAgentToTrip(agent3, trip31);
        
        await context.SaveChangesAsync();
        
        // Wait until trip 00 is over
        await Task.Delay(5000);
        
        manager1.CompleteTrip(trip00);
        
        // Write Report
        licensedAgent1.WriteReport("Report for Trip 00", trip00, "This is the Content for the Report");
        
        await context.SaveChangesAsync();

        
        // Write Review
        var review1 = customer1.WriteReview("Review from customer 1", 5, trip00, "This is the Content for the Review");
        var review2 = customer1.WriteReview("Review from customer 2", 4, trip00, "This is the Content for the Review");

        if (review1 != null) context.Reviews.Add(review1);
        if (review2 != null) context.Reviews.Add(review2);

        await context.SaveChangesAsync();

        // Paradoxes
        var paradox1 = new Paradox(trip00);
        var paradox2 = new Paradox(trip00);
        var paradox3 = new Paradox(trip00);
        
        context.Paradoxes.Add(paradox1);
        context.Paradoxes.Add(paradox2);
        context.Paradoxes.Add(paradox3);
        
        await context.SaveChangesAsync();
        
        // Make Trip Critical
        manager1.MakeTripCritical(trip00, licensedAgent2);
        
        await context.SaveChangesAsync();
        
        // Process and solve Paradoxes
        licensedAgent1.ProcessParadox(paradox1);
        licensedAgent1.SolveParadox(paradox1);
        
        licensedAgent2.ProcessParadox(paradox2);
        
        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task Database_ShouldInitialize_Managers()
    {
        await using var context = new TimeTravelAgencyContext(_dbContextOptions);
        await context.Database.EnsureCreatedAsync();

        var manager = new Manager("Jane", "Doe", "jane@doe.com", "+4367762698232");
        
        context.Managers.Add(manager);
        await context.SaveChangesAsync();

        Assert.NotNull(await context.Managers.FirstOrDefaultAsync());
    }

    [Fact]
    public async Task Database_ShouldInitialize_Agents()
    {
        await using var context = new TimeTravelAgencyContext(_dbContextOptions);
        await context.Database.EnsureCreatedAsync();

        var agent = new Agent("Alice", "Smith", DateTime.Now.AddYears(-25), 2025);
        
        context.Agents.Add(agent);
        await context.SaveChangesAsync();

        Assert.NotNull(await context.Agents.FirstOrDefaultAsync());
    }

    [Fact]
    public async Task Database_ShouldInitialize_Trips()
    {
        await using var context = new TimeTravelAgencyContext(_dbContextOptions);
        await context.Database.EnsureCreatedAsync();

        var licensedAgent = new LicensedAgent("James", "Bond", DateTime.Now.AddYears(-40), 1940, 007, DateTime.Now.AddYears(3));
        var manager = new Manager("Foo", "Baa", "foo@baa.com", "+1234567890");
        var trip = manager.CreateTrip(DateTime.Now, licensedAgent);

        context.LicensedAgents.Add(licensedAgent);
        context.Managers.Add(manager);
        context.Trips.Add(trip);
        await context.SaveChangesAsync();

        Assert.NotNull(await context.Trips.FirstOrDefaultAsync());
    }

    [Fact]
    public async Task Database_ShouldInitialize_Paradoxes()
    {
        await using var context = new TimeTravelAgencyContext(_dbContextOptions);
        await context.Database.EnsureCreatedAsync();

        var licensedAgent = new LicensedAgent("Chrisi", "How", DateTime.Now.AddYears(-40), 2024, 009,
            DateTime.Now.AddYears(3));
        var manager = new Manager("Con", "Luc", "con@luc.com", "+1234567890");
        var trip = manager.CreateTrip(DateTime.Now, licensedAgent);
        var paradox = new Paradox(trip);

        context.LicensedAgents.Add(licensedAgent);
        context.Managers.Add(manager);
        context.Trips.Add(trip);
        context.Paradoxes.Add(paradox);
        await context.SaveChangesAsync();

        Assert.NotNull(await context.Paradoxes.FirstOrDefaultAsync());
    }

    [Fact]
    public async Task Database_ShouldInitialize_Reports()
    {
        await using var context = new TimeTravelAgencyContext(_dbContextOptions);
        await context.Database.EnsureCreatedAsync();

        var licensedAgent =
            new LicensedAgent("James", "Bond", DateTime.Now.AddYears(-40), 1940, 007, DateTime.Now.AddYears(3));
        var manager = new Manager("Foo", "Baa", "foo@baa.com", "+1234567890");
        var trip = manager.CreateTrip(DateTime.Now, licensedAgent);
        var report = licensedAgent.WriteReport("Report", trip);

        context.LicensedAgents.Add(licensedAgent);
        context.Managers.Add(manager);
        context.Trips.Add(trip);
        context.Reports.Add(report);
        await context.SaveChangesAsync();

        Assert.NotNull(await context.Reports.FirstOrDefaultAsync());
    }


// Agents
    
    [Fact]
    public async Task GetSpecialisationEpoch_CorrectEpoch()
    {
        await using var context = new TimeTravelAgencyContext(_dbContextOptions);
        
        var agent = new Agent("James", "Bond", DateTime.Now.AddYears(-20), 1900);
        
        context.Agents.Add(agent);
        await context.SaveChangesAsync();
        
        var specialisationEpoch = agent.SpecialisationEpoch; // is set in SaveChangesAsync()
        
        Assert.Equal(agent.SpecialisationEpoch.Name, specialisationEpoch.Name);
    }
}