using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using TimeTravelAgency.Application.Infrastructure;
using TimeTravelAgency.Application.Model;
using TimeTravelAgency.Application.Service;
using Xunit;

namespace TimeTravelAgency.Test;

/// <summary>Paradoxes only on running trips, critical threshold on open paradoxes, and agent stabilisation.</summary>
public class ParadoxResolutionTest : IDisposable
{
    private static Address Addr => new("Street", 1010, "City");
    private readonly SqliteConnection _connection;
    private readonly TimeTravelAgencyContext _context;

    public ParadoxResolutionTest()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _context = new TimeTravelAgencyContext(new DbContextOptionsBuilder<TimeTravelAgencyContext>()
            .UseSqlite(_connection)
            .Options);
        _context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private async Task<(Trip trip, LicensedAgent agent)> CreateTripAsync(TimeSpan departureFromNow)
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", Addr);
        var agent = new LicensedAgent("Karl", "Mayer", DateTime.UtcNow.AddYears(-30), 2025, 7, DateTime.UtcNow.AddYears(1), Addr);
        _context.Managers.Add(manager);
        _context.LicensedAgents.Add(agent);
        await _context.SaveChangesAsync();

        var trip = manager.CreateTrip(DateTime.UtcNow + departureFromNow, agent, "Ancient Rome", durationMinutes: 120);
        await _context.SaveChangesAsync();
        return (trip, agent);
    }

    private async Task<Agent> CreateOutsiderAsync()
    {
        var outsider = new Agent("Otto", "Fremd", DateTime.UtcNow.AddYears(-30), 1900, Addr);
        _context.Agents.Add(outsider);
        await _context.SaveChangesAsync();
        return outsider;
    }

    [Fact]
    public async Task AddParadox_ToScheduledTrip_Throws()
    {
        var (trip, _) = await CreateTripAsync(TimeSpan.FromDays(2));
        var service = new ParadoxService(_context);

        Assert.Throws<InvalidOperationException>(() => service.AddParadoxToTrip(trip.Guid));
        Assert.Empty(_context.Paradoxes);
    }

    [Fact]
    public async Task SpawnRandomParadox_IgnoresScheduledTrips()
    {
        await CreateTripAsync(TimeSpan.FromDays(2));
        var service = new ParadoxService(_context);

        Assert.Null(service.SpawnRandomParadox());
    }

    [Fact]
    public async Task SpawnRandomParadox_SkipsSaturatedTrips()
    {
        var (trip, _) = await CreateTripAsync(TimeSpan.FromMinutes(-5));
        var service = new ParadoxService(_context);
        for (var i = 0; i < ParadoxService.MaxOpenParadoxesPerTrip; i++)
            Assert.NotNull(service.SpawnRandomParadox());

        Assert.Null(service.SpawnRandomParadox());
        Assert.Equal(ParadoxService.MaxOpenParadoxesPerTrip, _context.Paradoxes.Count(p => p.TripId == trip.Id));
    }

    [Fact]
    public async Task SolvedParadoxes_DoNotCountTowardsCritical()
    {
        var (trip, agent) = await CreateTripAsync(TimeSpan.FromMinutes(-5));
        var service = new ParadoxService(_context);

        var first = service.AddParadoxToTrip(trip.Guid);
        service.Resolve(first.Paradox.Guid, agent.Guid);
        service.AddParadoxToTrip(trip.Guid);
        var third = service.AddParadoxToTrip(trip.Guid);

        Assert.False(third.TripBecameCritical);

        var fourth = service.AddParadoxToTrip(trip.Guid);
        Assert.True(fourth.TripBecameCritical);
    }

    [Fact]
    public async Task Agent_EngageAndResolve_SolvesParadox()
    {
        var (trip, agent) = await CreateTripAsync(TimeSpan.FromMinutes(-5));
        var service = new ParadoxService(_context);
        var spawned = service.AddParadoxToTrip(trip.Guid);

        Assert.Equal("InProcess", service.Engage(spawned.Paradox.Guid, agent.Guid).ParadoxStatus);
        var solved = service.Resolve(spawned.Paradox.Guid, agent.Guid);

        Assert.Equal("Solved", solved.ParadoxStatus);
        Assert.NotNull(solved.ResolvedAt);
        Assert.Equal(agent.Id, solved.ResolvedByAgentId);
        Assert.Throws<InvalidOperationException>(() => service.Resolve(spawned.Paradox.Guid, agent.Guid));
    }

    [Fact]
    public async Task Agent_Fail_EscalatesParadox_AndCanRetry()
    {
        var (trip, agent) = await CreateTripAsync(TimeSpan.FromMinutes(-5));
        var service = new ParadoxService(_context);
        var spawned = service.AddParadoxToTrip(trip.Guid);

        Assert.Equal("Escalated", service.Fail(spawned.Paradox.Guid, agent.Guid).ParadoxStatus);
        Assert.Equal("Solved", service.Resolve(spawned.Paradox.Guid, agent.Guid).ParadoxStatus);
    }

    [Fact]
    public async Task Agent_NotOnTrip_CannotResolve()
    {
        var (trip, _) = await CreateTripAsync(TimeSpan.FromMinutes(-5));
        var outsider = await CreateOutsiderAsync();
        var service = new ParadoxService(_context);
        var spawned = service.AddParadoxToTrip(trip.Guid);

        Assert.Throws<UnauthorizedAccessException>(() => service.Resolve(spawned.Paradox.Guid, outsider.Guid));
    }

    [Fact]
    public async Task Lifecycle_SyncStatuses_ActivatesDepartedTrips()
    {
        var (trip, _) = await CreateTripAsync(TimeSpan.FromMinutes(30));
        Assert.Equal(TripStatus.Scheduled, trip.TripStatus);

        var changed = TripLifecycleService.SyncStatuses(_context, DateTime.UtcNow.AddMinutes(31));

        Assert.Equal(1, changed);
        Assert.Equal(TripStatus.Active, _context.Trips.AsNoTracking().Single().TripStatus);
    }
}
