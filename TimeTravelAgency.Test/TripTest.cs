using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Test;

public class TripTest
{
    [Fact]
    public void Trip_AddCustomer_Success()
    {
        var customer = new Customer("Linus", "Sch", "linus@sch.com", "1234567890", DateTime.Now.AddYears(-21));
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890");
        var licencedAgent1 = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(5), licencedAgent1);

        customer.AssignToTrip(trip);
        
        Assert.Contains(customer, trip.Customers);
    }

    [Fact]
    public void Trip_RemoveCustomer_Success()
    {
        var customer = new Customer("Linus", "Sch", "linus@sch.com", "1234567890", DateTime.Now.AddYears(-21));
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890");
        var licencedAgent1 = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(5), licencedAgent1);

        customer.AssignToTrip(trip);
        Assert.Contains(customer, trip.Customers);
        customer.CheckOutOfTrip(trip);
        
        Assert.DoesNotContain(customer, trip.Customers);
    }

    [Fact]
    public void Trip_AddAgent_Success()
    {
        var agent1 = new Agent("Chrisi", "How", DateTime.Today.AddYears(-20), 2060);
        var agent2 = new Agent("Quisi", "How", DateTime.Today.AddYears(-20), 2060);
        var manager = new Manager("Con", "Bel", "con@bel.com", "+1234567890");
        agent1.AssignAgentToManager(manager);
        agent2.AssignAgentToManager(manager);
        var licensedAgent = manager.MakeAgentLicensed(agent1, 007, DateTime.MaxValue);
        var trip = manager.CreateTrip(DateTime.Now.AddDays(5), licensedAgent);
        
        manager.AddAgentToTrip(agent2, trip);
        
        Assert.Equal(agent2, trip.Agent);
    }
    
    [Fact]
    public void Trip_AddSecondAgent_Failure()
    {
        var agent1 = new Agent("Chrisi", "How", DateTime.Today.AddYears(-20), 2060);
        var agent2 = new Agent("Quisi", "How", DateTime.Today.AddYears(-20), 2060);
        var agent3 = new Agent("Princess", "How", DateTime.Today.AddYears(-20), 2060);
        var manager = new Manager("Con", "Bel", "con@bel.com", "+1234567890");
        agent1.AssignAgentToManager(manager);
        agent2.AssignAgentToManager(manager);
        var licensedAgent = manager.MakeAgentLicensed(agent1, 007, DateTime.MaxValue);
        var trip = manager.CreateTrip(DateTime.Now.AddDays(5), licensedAgent);
        
        manager.AddAgentToTrip(agent2, trip);
        manager.AddAgentToTrip(agent3, trip);
        
        Assert.Equal(agent2, trip.Agent);
    }
    
    [Fact]
    public void Trip_AddRemoveAgent_Success()
    {
        var agent1 = new Agent("Chrisi", "How", DateTime.Today.AddYears(-20), 2060);
        var agent2 = new Agent("Quisi", "How", DateTime.Today.AddYears(-20), 2060);
        var manager = new Manager("Con", "Bel", "con@bel.com", "+1234567890");
        agent1.AssignAgentToManager(manager);
        agent2.AssignAgentToManager(manager);
        var licensedAgent = manager.MakeAgentLicensed(agent1, 007, DateTime.MaxValue);
        var trip = manager.CreateTrip(DateTime.Now.AddDays(5), licensedAgent);
        
        manager.RemoveAgentFromTrip(agent2, trip);
        
        Assert.Null(trip.Agent);
    }
}