using System;
using TimeTravelAgency.Application.Model;
using Xunit;

namespace TimeTravelAgency.Test;

public class ParadoxTest
{
    [Fact]
    public void ParadoxType_ShouldBeSet()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890");
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        var paradox = new Paradox(trip);
        
        Assert.True(Enum.IsDefined(typeof(ParadoxType), paradox.ParadoxType), 
            "The ParadoxType should be one of the defined enum values.");
    }

    [Fact]
    public void ParadoxStatus_ShouldBeSet_GrandFatherParadox()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890");
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        var paradox = new Paradox(trip)
        {
            ParadoxType = ParadoxType.GrandFatherParadox
        };
        
        Assert.Equal(ParadoxType.GrandFatherParadox, paradox.ParadoxType);
    }
    
    [Fact]
    public void ParadoxStatus_ShouldBeSet_BootstrapParadox()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890");
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        var paradox = new Paradox(trip)
        {
            ParadoxType = ParadoxType.BootstrapParadox
        };
        
        Assert.Equal(ParadoxType.BootstrapParadox, paradox.ParadoxType);
    }
    
    [Fact]
    public void ParadoxStatus_ShouldBeSet_PredestinationParadox()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890");
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        var paradox = new Paradox(trip)
        {
            ParadoxType = ParadoxType.PredestinationParadox
        };
        
        Assert.Equal(ParadoxType.PredestinationParadox, paradox.ParadoxType);
    }
    
    [Fact]
    public void ParadoxStatus_ShouldBeSet_InformationParadox()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890");
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        var paradox = new Paradox(trip)
        {
            ParadoxType = ParadoxType.InformationParadox
        };
        
        Assert.Equal(ParadoxType.InformationParadox, paradox.ParadoxType);
    }

    [Fact]
    public void ParadoxDescription_ShouldBeSetCorrectly_GrandFatherParadox()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890");
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        var paradox = new Paradox(trip)
        {
            ParadoxType = ParadoxType.GrandFatherParadox
        };
        
        Assert.Equal(
            "A time travel paradox where altering past events prevents one's own existence.", 
            paradox.ParadoxDescription);
    }
    
    [Fact]
    public void ParadoxDescription_ShouldBeSetCorrectly_BootstrapParadox()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890");
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        var paradox = new Paradox(trip)
        {
            ParadoxType = ParadoxType.BootstrapParadox
        };
        
        Assert.Equal(
            "A scenario where an object or information is sent back in time, becoming the cause of its own existence.", 
            paradox.ParadoxDescription);
    }

    [Fact]
    public void ParadoxDescription_ShouldBeSetCorrectly_PredestinationParadox()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890");
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        var paradox = new Paradox(trip)
        {
            ParadoxType = ParadoxType.PredestinationParadox
        };

        Assert.Equal(
            "A paradox where actions taken by time travelers in the past are part of a pre-determined future, creating an inescapable loop of events.",
            paradox.ParadoxDescription);
    }
    
    [Fact]
    public void ParadoxDescription_ShouldBeSetCorrectly_InformationParadox()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890");
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        var paradox = new Paradox(trip)
        {
            ParadoxType = ParadoxType.InformationParadox
        };

        Assert.Equal(
            "A paradox where future information is sent to the past, creating logical inconsistencies.",
            paradox.ParadoxDescription);
    }

    [Fact]
    public void ParadoxStatus_ShouldBeSetCorrectly_InQueue()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890");
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        var paradox = new Paradox(trip);
        
        Assert.Equal(ParadoxStatus.InQueue, paradox.ParadoxStatus);
    }
    
    [Fact]
    public void ParadoxStatus_ShouldBeSetCorrectly_InProcess()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890");
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        var paradox = new Paradox(trip);
        
        licencedAgent.ProcessParadox(paradox);
        
        Assert.Equal(ParadoxStatus.InProcess, paradox.ParadoxStatus);
    }
    
    [Fact]
    public void ParadoxStatus_ShouldBeSetCorrectly_Solved()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890");
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        var paradox = new Paradox(trip);
        
        licencedAgent.ProcessParadox(paradox);
        licencedAgent.SolveParadox(paradox);
        
        Assert.Equal(ParadoxStatus.Solved, paradox.ParadoxStatus);
    }
}