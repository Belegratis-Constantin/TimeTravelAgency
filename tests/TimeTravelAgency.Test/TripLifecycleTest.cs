using System;
using TimeTravelAgency.Application.Model;
using Xunit;

namespace TimeTravelAgency.Test;

/// <summary>Trip lifecycle (Scheduled → Active → Completed) and the booking rules built on it.</summary>
public class TripLifecycleTest
{
    private static Address Addr => new("Street", 1010, "City");

    private static (Manager manager, LicensedAgent agent) Staff(int licence = 7)
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", Addr);
        var agent = new LicensedAgent("Karl", "Mayer", DateTime.UtcNow.AddYears(-30), 2025, licence, DateTime.UtcNow.AddYears(1), Addr);
        return (manager, agent);
    }

    private static Customer NewCustomer() =>
        new("Linus", "Sch", "linus@sch.com", "1234567890", DateTime.UtcNow.AddYears(-21), Addr);

    [Fact]
    public void Trip_StatusFollowsDepartureAndReturn()
    {
        var (manager, agent) = Staff();
        var start = DateTime.UtcNow.AddHours(1);
        var trip = manager.CreateTrip(start, agent, "Rome", durationMinutes: 120);

        Assert.Equal(TripStatus.Scheduled, trip.TripStatus);
        Assert.Equal(TripStatus.Scheduled, trip.StatusAt(start.AddMinutes(-1)));
        Assert.Equal(TripStatus.Active, trip.StatusAt(start));
        Assert.Equal(TripStatus.Active, trip.StatusAt(start.AddMinutes(119)));
        Assert.Equal(TripStatus.Completed, trip.StatusAt(start.AddMinutes(120)));
        Assert.Equal(start.AddMinutes(120), trip.ReturnInRealLife);
    }

    [Fact]
    public void Trip_SyncStatus_AppliesTransitions_ButKeepsCancelled()
    {
        var (manager, agent) = Staff();
        var start = DateTime.UtcNow.AddHours(1);
        var trip = manager.CreateTrip(start, agent, durationMinutes: 60);

        Assert.True(trip.SyncStatus(start.AddMinutes(5)));
        Assert.Equal(TripStatus.Active, trip.TripStatus);
        Assert.True(trip.SyncStatus(start.AddMinutes(61)));
        Assert.Equal(TripStatus.Completed, trip.TripStatus);
        Assert.False(trip.SyncStatus(start.AddMinutes(90)));

        var (manager2, agent2) = Staff(8);
        var cancelled = manager2.CreateTrip(start, agent2, durationMinutes: 60);
        agent2.CancelTrip(cancelled);
        Assert.False(cancelled.SyncStatus(start.AddMinutes(5)));
        Assert.Equal(TripStatus.Cancelled, cancelled.TripStatus);
    }

    [Fact]
    public void Trip_TripCreatedWhileUnderWay_IsActive()
    {
        var (manager, agent) = Staff();
        var trip = manager.CreateTrip(DateTime.UtcNow.AddMinutes(-10), agent, durationMinutes: 60);
        Assert.Equal(TripStatus.Active, trip.TripStatus);
    }

    [Fact]
    public void Trip_InvalidDuration_Throws()
    {
        var (manager, agent) = Staff();
        Assert.Throws<ArgumentOutOfRangeException>(() => manager.CreateTrip(DateTime.UtcNow.AddDays(1), agent, durationMinutes: 1));
    }

    [Fact]
    public void Customer_CannotBookTripThatIsUnderWay()
    {
        var (manager, agent) = Staff();
        var trip = manager.CreateTrip(DateTime.UtcNow.AddMinutes(-10), agent, durationMinutes: 60);

        Assert.Throws<InvalidOperationException>(() => NewCustomer().AssignToTrip(trip));
    }

    [Fact]
    public void Customer_CannotBookOverlappingTimeSpan()
    {
        var (m1, a1) = Staff(1);
        var (m2, a2) = Staff(2);
        var start = DateTime.UtcNow.AddDays(3);
        var longTrip = m1.CreateTrip(start, a1, durationMinutes: 8 * 60);
        var duringLongTrip = m2.CreateTrip(start.AddHours(5), a2, durationMinutes: 60);
        var customer = NewCustomer();

        customer.AssignToTrip(longTrip);

        var ex = Assert.Throws<InvalidOperationException>(() => customer.AssignToTrip(duringLongTrip));
        Assert.Contains("already travelling", ex.Message);
    }

    [Fact]
    public void Customer_CanBookBackToBackTrips()
    {
        var (m1, a1) = Staff(1);
        var (m2, a2) = Staff(2);
        var start = DateTime.UtcNow.AddDays(3);
        var first = m1.CreateTrip(start, a1, durationMinutes: 120);
        var second = m2.CreateTrip(start.AddMinutes(120), a2, durationMinutes: 120);
        var customer = NewCustomer();

        customer.AssignToTrip(first);
        customer.AssignToTrip(second);

        Assert.Contains(customer, second.Customers);
    }

    [Fact]
    public void Customer_CannotBookSameTripTwice()
    {
        var (manager, agent) = Staff();
        var trip = manager.CreateTrip(DateTime.UtcNow.AddDays(3), agent);
        var customer = NewCustomer();
        customer.AssignToTrip(trip);

        Assert.Throws<InvalidOperationException>(() => customer.AssignToTrip(trip));
    }

    [Fact]
    public void Customer_AtMostOneActiveTrip()
    {
        var (m1, a1) = Staff(1);
        var (m2, a2) = Staff(2);
        var start = DateTime.UtcNow.AddDays(3);
        var first = m1.CreateTrip(start, a1, durationMinutes: 120);
        var second = m2.CreateTrip(start.AddDays(1), a2, durationMinutes: 120);
        var customer = NewCustomer();
        customer.AssignToTrip(first);
        customer.AssignToTrip(second);

        Assert.Equal(first, customer.GetCurrentTrip(start.AddMinutes(30)));
        Assert.Equal(second, customer.GetCurrentTrip(start.AddDays(1).AddMinutes(30)));
        Assert.Null(customer.GetCurrentTrip(start.AddHours(5)));
    }

    [Fact]
    public void Manager_MakeTripCritical_ScheduledTrip_Throws()
    {
        var (manager, agent) = Staff();
        var trip = manager.CreateTrip(DateTime.UtcNow.AddDays(3), agent);
        _ = new Paradox(trip);
        _ = new Paradox(trip);
        var support = new LicensedAgent("Karl", "Anton", DateTime.UtcNow.AddYears(-25), 2025, 10, DateTime.UtcNow.AddYears(3), Addr);
        support.AssignAgentToManager(manager);

        Assert.Throws<InvalidOperationException>(() => manager.MakeTripCritical(trip, support));
    }
}
