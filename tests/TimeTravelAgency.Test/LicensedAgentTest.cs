using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Test;

public class LicensedAgentTest
{
    [Fact]
    public void LicensedAgent_CancelTrip()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        
        var trip = manager.CreateTrip(DateTime.Now.AddDays(20), licencedAgent);
        
        licencedAgent.CancelTrip(trip);
        
        Assert.Equal(TripStatus.Cancelled, trip.TripStatus);
    }

    [Fact]
    public void LicensedAgent_ProcessParadox_Success()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        
        var trip = manager.CreateTrip(DateTime.Now.AddDays(20), licencedAgent);
        var paradox = new Paradox(trip);
        
        licencedAgent.ProcessParadox(paradox);
        Assert.Equal(ParadoxStatus.InProcess, paradox.ParadoxStatus);
    }
    
    [Fact]
    public void LicensedAgent_SolveParadox_Success()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        
        var trip = manager.CreateTrip(DateTime.Now.AddDays(20), licencedAgent);
        var paradox = new Paradox(trip);
        
        licencedAgent.ProcessParadox(paradox);
        licencedAgent.SolveParadox(paradox);
        Assert.Equal(ParadoxStatus.Solved, paradox.ParadoxStatus);
    }
    
    [Fact]
    public void LicensedAgent_SolveParadox_Failure()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent =
            new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(20), licencedAgent);
        var current = new Paradox(trip);
        var queued = new Paradox(trip);

        // Only the paradox whose turn it is can be solved — the queued one stays in the queue.
        licencedAgent.SolveParadox(queued);
        Assert.Equal(ParadoxStatus.InQueue, queued.ParadoxStatus);

        // Solving the current one lets the queued paradox move up.
        licencedAgent.SolveParadox(current);
        Assert.Equal(ParadoxStatus.Solved, current.ParadoxStatus);
        Assert.Equal(ParadoxStatus.InProcess, queued.ParadoxStatus);
    }
}