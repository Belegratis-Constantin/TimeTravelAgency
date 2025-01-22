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

    [Fact]
    public async Task Database_SeedTest()
    {
        await using var context = new TimeTravelAgencyContext(_dbContextOptions);
        
        context.Seed();

        Assert.NotNull(context.Epochs.FirstOrDefault());
        Assert.NotNull(context.HistoricalEvents.FirstOrDefault());
        
        Assert.NotNull(context.Agents.FirstOrDefault());
        Assert.NotNull(context.LicensedAgents.FirstOrDefault());
        Assert.NotNull(context.Managers.FirstOrDefault());
        Assert.NotNull(context.Trips.FirstOrDefault());
        Assert.NotNull(context.CriticalTrips.FirstOrDefault());
        Assert.NotNull(context.Paradoxes.FirstOrDefault());
        Assert.NotNull(context.Reports.FirstOrDefault());
        Assert.NotNull(context.Reviews.FirstOrDefault());

        var manager = context.Managers.First();
        manager.AddAgent(context.Agents.First());
        await context.SaveChangesAsync();
    }
    
    public DatabaseTests()
    {
        _dbContextOptions = new DbContextOptionsBuilder<TimeTravelAgencyContext>()
            .UseSqlite("Data Source=TimeTravelAgencyTest.db")
            .Options;
        
        using var context = new TimeTravelAgencyContext(_dbContextOptions);
        context.Database.EnsureDeleted();
        context.Database.EnsureCreated();
    }

    [Fact]
    public async Task Database_ShouldInitialize_Managers()
    {
        await using var context = new TimeTravelAgencyContext(_dbContextOptions);
        await context.Database.EnsureCreatedAsync();

        var manager = new Manager("Jane", "Doe", "jane@doe.com", "+1234567890", new Address("Street", 1010, "City"));
        
        context.Managers.Add(manager);
        await context.SaveChangesAsync();

        Assert.NotNull(await context.Managers.FirstOrDefaultAsync());
    }

    [Fact]
    public async Task Database_ShouldInitialize_Agents()
    {
        await using var context = new TimeTravelAgencyContext(_dbContextOptions);
        await context.Database.EnsureCreatedAsync();

        var agent = new Agent("Alice", "Smith", DateTime.Now.AddYears(-25), 2025, new Address("Street", 1010, "City"));
        
        context.Agents.Add(agent);
        await context.SaveChangesAsync();

        Assert.NotNull(await context.Agents.FirstOrDefaultAsync());
    }

    [Fact]
    public async Task Database_ShouldInitialize_AgentsAndMakeThemLicensed()
    {
        await using var context = new TimeTravelAgencyContext(_dbContextOptions);
        await context.Database.EnsureCreatedAsync();

        var manager = new Manager("Jane", "Doe", "jane@doe.com", "+1234567890", new Address("Street", 1010, "City"));
        var agent = new Agent("Alice", "Smith", DateTime.Now.AddYears(-25), 2025, new Address("Street", 1010, "City"));
        
        agent.AssignAgentToManager(manager);
        var licensedAgent = manager.MakeAgentLicensed(agent, 007, DateTime.Now.AddYears(25));
        context.Agents.Add(licensedAgent);
        await context.SaveChangesAsync();

        Assert.NotNull(await context.Agents.FirstOrDefaultAsync());
    }

    [Fact]
    public async Task Database_ShouldInitialize_Trips()
    {
        await using var context = new TimeTravelAgencyContext(_dbContextOptions);
        await context.Database.EnsureCreatedAsync();

        var licensedAgent = new LicensedAgent("James", "Bond", DateTime.Now.AddYears(-40), 1940, 007, DateTime.Now.AddYears(3), new Address("Street", 1010, "City"));
        var manager = new Manager("Foo", "Baa", "foo@baa.com", "+1234567890", new Address("Street", 1010, "City"));
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
            DateTime.Now.AddYears(3), new Address("Street", 1010, "City"));
        var manager = new Manager("Con", "Luc", "con@luc.com", "+1234567890", new Address("Street", 1010, "City"));
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
            new LicensedAgent("James", "Bond", DateTime.Now.AddYears(-40), 1940, 007, DateTime.Now.AddYears(3), new Address("Street", 1010, "City"));
        var manager = new Manager("Foo", "Baa", "foo@baa.com", "+1234567890", new Address("Street", 1010, "City"));
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
        
        var agent = new Agent("James", "Bond", DateTime.Now.AddYears(-20), 1900, new Address("Street", 1010, "City"));
        
        context.Agents.Add(agent);
        await context.SaveChangesAsync();
        
        var specialisationEpoch = agent.SpecialisationEpoch; // is set in SaveChangesAsync()
        
        Assert.Equal(agent.SpecialisationEpoch.Name, specialisationEpoch.Name);
    }
}