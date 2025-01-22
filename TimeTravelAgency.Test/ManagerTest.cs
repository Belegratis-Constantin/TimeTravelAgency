using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Test;

public class ManagerTest
{
    [Fact]
    public void Manager_ShouldThrowException_WhenEmailIsInvalid_1()
    {
        const string firstname = "John";
        const string lastname = "Doe";
        const string email = "user@com";
        const string phoneNumber = "+123456789";
        
        Assert.Throws<ArgumentException>(() => new Manager(firstname, lastname, email, phoneNumber, new Address("Street", 1010, "City")));
    }
    
    [Fact]
    public void Manager_ShouldThrowException_WhenEmailIsInvalid_2()
    {
        const string firstname = "John";
        const string lastname = "Doe";
        const string email = "@example.com";
        const string phoneNumber = "+123456789";
        
        Assert.Throws<ArgumentException>(() => new Manager(firstname, lastname, email, phoneNumber, new Address("Street", 1010, "City")));
    }
    
    [Fact]
    public void Manager_ShouldThrowException_WhenEmailIsInvalid_3()
    {
        const string firstname = "John";
        const string lastname = "Doe";
        const string email = "user@.com";
        const string phoneNumber = "+123456789";
        
        Assert.Throws<ArgumentException>(() => new Manager(firstname, lastname, email, phoneNumber, new Address("Street", 1010, "City")));
    }
    
    [Fact]
    public void Manager_CreateTrip_Success()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent =
            new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(20), licencedAgent);

        Assert.IsType<Trip>(trip);
        Assert.Contains(trip, manager.Trips);
    }
    
    [Fact]
    public void Manager_CreateTrip_TooManyTrips_Failure()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent =
            new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip1 = manager.CreateTrip(DateTime.Now.AddDays(1), licencedAgent);
        var trip2 = manager.CreateTrip(DateTime.Now.AddDays(2), licencedAgent);
        var trip3 = manager.CreateTrip(DateTime.Now.AddDays(3), licencedAgent);
        var trip4 = manager.CreateTrip(DateTime.Now.AddDays(4), licencedAgent);
        var trip5 = manager.CreateTrip(DateTime.Now.AddDays(5), licencedAgent);
        
        Assert.Throws<InvalidOperationException>(() => manager.CreateTrip(DateTime.Now.AddDays(6), licencedAgent));
        Assert.Contains(trip1, manager.Trips);
        Assert.Contains(trip2, manager.Trips);
        Assert.Contains(trip3, manager.Trips);
        Assert.Contains(trip4, manager.Trips);
        Assert.Contains(trip5, manager.Trips); 
    }
    
    [Fact]
    public void Manager_makes_Agent_LicensedAgent()
    {
        var agent = new Agent("Judith", "Boond", DateTime.Now.AddYears(-25), -190000, new Address("Street", 1010, "City"));
        var manager = new Manager("Quisi", "Princess", "quisi@princess.world", "+1234567890", new Address("Street", 1010, "City"));
        agent.AssignAgentToManager(manager);
        var newLicensedAgent = manager.MakeAgentLicensed(agent, 001, DateTime.Now.AddYears(4));
        
        Assert.IsType<LicensedAgent>(newLicensedAgent);
        Assert.Equal(agent.Firstname, newLicensedAgent.Firstname);
        Assert.Equal(agent.Lastname, newLicensedAgent.Lastname);
        Assert.Equal(agent.DateOfBirth, newLicensedAgent.DateOfBirth);
        Assert.Equal(agent.SpecialisationTime, newLicensedAgent.SpecialisationTime);
        Assert.Equal(agent.Reports, newLicensedAgent.Reports);
        Assert.Equal(agent.Trips, newLicensedAgent.Trips);
        Assert.Equal(agent.EpochId, newLicensedAgent.EpochId);
    }
    
    [Fact]
    public void Manager_MakesTripCritical()
    {
        var licensedAgent = new LicensedAgent("Judith", "Boond", DateTime.Now.AddYears(-25), -190000, 007, DateTime.Now.AddYears(3), new Address("Street", 1010, "City"));
        var manager = new Manager("Quisi", "Princess", "quisi@princess.world", "+1234567890", new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now, licensedAgent);
        var paradox1 = new Paradox(trip);
        var paradox2 = new Paradox(trip);
        var licensedSupportAgent = new LicensedAgent("Karl", "Anton", DateTime.Now.AddYears(-25), -190000, 010, DateTime.Now.AddYears(3), new Address("Street", 1010, "City"));
        
        var criticalTrip = manager.MakeTripCritical(trip, licensedSupportAgent);

        Assert.NotNull(criticalTrip);
        Assert.IsType<CriticalTrip>(criticalTrip);
    }

    [Fact]
    public void Manager_AddAgentToTrip_ManagedAgent_Success()
    {
        var agent1 = new Agent("Chrisi", "How", DateTime.Today.AddYears(-20), 2060, new Address("Street", 1010, "City"));
        var agent2 = new Agent("Quisi", "How", DateTime.Today.AddYears(-20), 2060, new Address("Street", 1010, "City"));
        var manager = new Manager("Con", "Bel", "con@bel.com", "+1234567890", new Address("Street", 1010, "City"));
        agent1.AssignAgentToManager(manager);
        agent2.AssignAgentToManager(manager);
        var licensedAgent = manager.MakeAgentLicensed(agent1, 007, DateTime.MaxValue);
        var trip = manager.CreateTrip(DateTime.Now.AddDays(5), licensedAgent);
        
        manager.AddAgentToTrip(agent2, trip);
        
        Assert.Contains(agent2, manager.Agents);
        Assert.Equal(agent2, trip.Agent);
    }
    
    [Fact]
    public void Manager_AddAgentToTrip_NotManagedAgent_Success()
    {
        var agent1 = new Agent("Chrisi", "How", DateTime.Today.AddYears(-20), 2060, new Address("Street", 1010, "City"));
        var agent2 = new Agent("Quisi", "How", DateTime.Today.AddYears(-20), 2060, new Address("Street", 1010, "City"));
        var manager = new Manager("Con", "Bel", "con@bel.com", "+1234567890", new Address("Street", 1010, "City"));
        agent1.AssignAgentToManager(manager);
        var licensedAgent = manager.MakeAgentLicensed(agent1, 007, DateTime.MaxValue);
        var trip = manager.CreateTrip(DateTime.Now.AddDays(5), licensedAgent);
        
        manager.AddAgentToTrip(agent2, trip);
        
        Assert.DoesNotContain(agent2, manager.Agents);
        Assert.Null(trip.Agent);
    }
    
    [Fact]
    public void Manager_RemoveAgentFromTrip_ManagedAgent_Success()
    {
        var agent1 = new Agent("Chrisi", "How", DateTime.Today.AddYears(-20), 2060, new Address("Street", 1010, "City"));
        var agent2 = new Agent("Quisi", "How", DateTime.Today.AddYears(-20), 2060, new Address("Street", 1010, "City"));
        var manager = new Manager("Con", "Bel", "con@bel.com", "+1234567890", new Address("Street", 1010, "City"));
        agent1.AssignAgentToManager(manager);
        agent2.AssignAgentToManager(manager);
        var licensedAgent = manager.MakeAgentLicensed(agent1, 007, DateTime.MaxValue);
        var trip = manager.CreateTrip(DateTime.Now.AddDays(5), licensedAgent);
        
        manager.RemoveAgentFromTrip(agent2, trip);
        
        Assert.Contains(agent2, manager.Agents);
        Assert.Null(trip.Agent);
    }
    
    [Fact]
    public void Manager_RemoveAgentFromTrip_NotManagedAgent_Success()
    {
        var agent1 = new Agent("Chrisi", "How", DateTime.Today.AddYears(-20), 2060, new Address("Street", 1010, "City"));
        var agent2 = new Agent("Quisi", "How", DateTime.Today.AddYears(-20), 2060, new Address("Street", 1010, "City"));
        var manager1 = new Manager("Con", "Bel", "con@bel.com", "+1234567890", new Address("Street", 1010, "City"));
        var manager2 = new Manager("Fro", "Bel", "con@bel.com", "+1234567890", new Address("Street", 1010, "City"));
        agent1.AssignAgentToManager(manager1);
        agent2.AssignAgentToManager(manager1);
        var licensedAgent = manager1.MakeAgentLicensed(agent1, 007, DateTime.MaxValue);
        var trip = manager1.CreateTrip(DateTime.Now.AddDays(5), licensedAgent);
        
        manager1.AddAgentToTrip(agent2, trip);
        manager2.RemoveAgentFromTrip(agent2, trip);
        
        Assert.Contains(agent2, manager1.Agents);
        Assert.DoesNotContain(agent2, manager2.Agents);
        Assert.Equal(agent2, trip.Agent);
    }

    [Fact]
    public async Task Manager_CompleteTrip_Success()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddSeconds(3), licencedAgent);
        
        await Task.Delay(5000);
        
        manager.CompleteTrip(trip);
        
        Assert.Equal(TripStatus.Completed, trip.TripStatus);
    }
    
    [Fact]
    public void Manager_CompleteTrip_TripInFuture_Failure()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(20), licencedAgent);
        
        manager.CompleteTrip(trip);
        
        Assert.Equal(TripStatus.Active, trip.TripStatus);
    } 
}