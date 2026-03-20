using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using TimeTravelAgency.Application.Model;
using Xunit;

namespace TimeTravelAgency.Test;

public class AgentTest
{
    [Fact]
    public void WriteReport_WithoutContent_Success()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        
        licencedAgent.WriteReport("Trip finished", trip);
        
        var report = licencedAgent.Reports.FirstOrDefault(r => r.Header == "Trip finished");
        Assert.NotNull(report);
        Assert.Null(report.Content);
        
    }
    
    [Fact]
    public void WriteReport_WithContent_Success()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        
        licencedAgent.WriteReport("Trip finished", trip, "Some Content");
        
        var report = licencedAgent.Reports.FirstOrDefault(r => r.Header == "Trip finished");
        Assert.NotNull(report);
        Assert.Equal("Some Content", report.Content);
    }
    
    [Fact]
    public void WriteReport_InvalidTrip()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent1 = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var licencedAgent2 = new LicensedAgent("Franz", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        
        var trip2 = manager.CreateTrip(DateTime.Now.AddDays(20), licencedAgent2); // Trip for licensedAgent2
        
        Assert.Throws<ArgumentException>(() => licencedAgent1.WriteReport("Trip finished", trip2, "Some Content")); // => licensedAgent1 does not contain trip of licensedAgent2
    }

    [Fact]
    public void Agent_AssignAgentToManager_Success()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var agent = new Agent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, new Address("Street", 1010, "City"));

        agent.AssignAgentToManager(manager);
        
        Assert.Contains(agent, manager.Agents);
    }
    
    [Fact]
    public void Agent_AssignAgentToManager_Failure()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var agent = new Agent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, new Address("Street", 1010, "City"));
        
        Assert.DoesNotContain(agent, manager.Agents);
    }
}