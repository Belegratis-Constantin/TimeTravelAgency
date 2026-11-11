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

/// <summary>
/// Runtime paradox generation. Uses an isolated in-memory SQLite database per test,
/// so it does not need a running API or the shared test database file.
/// </summary>
public class ParadoxSimulationTest : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly TimeTravelAgencyContext _context;

    public ParadoxSimulationTest()
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

    private async Task<Trip> CreateTripAsync(string name = "Ancient Rome")
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var agent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-30), 2025, 7, DateTime.Now.AddYears(1), new Address("Street", 1010, "City"));
        _context.Managers.Add(manager);
        _context.LicensedAgents.Add(agent);
        await _context.SaveChangesAsync();

        // Paradoxes only emerge on trips that are under way, so the trip departed a few minutes ago.
        var trip = manager.CreateTrip(DateTime.UtcNow.AddMinutes(-10), agent, name);
        await _context.SaveChangesAsync();
        return trip;
    }

    [Fact]
    public void Paradox_Constructor_SetsCreatedAtAndQueueStatus()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var agent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), agent);

        var before = DateTime.UtcNow;
        var paradox = new Paradox(trip);
        var next = new Paradox(trip);

        Assert.InRange(paradox.CreatedAt, before.AddSeconds(-1), DateTime.UtcNow.AddSeconds(1));
        Assert.Equal(ParadoxStatus.InProcess, paradox.ParadoxStatus);
        Assert.Equal(ParadoxStatus.InQueue, next.ParadoxStatus);
        Assert.True(Enum.IsDefined(paradox.ParadoxType));
    }

    [Fact]
    public void Paradox_RandomType_CanProduceEveryType()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var agent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), agent);

        var seen = Enumerable.Range(0, 400).Select(_ => new Paradox(trip).ParadoxType).Distinct().ToList();

        Assert.Equal(Enum.GetValues<ParadoxType>().Length, seen.Count);
    }

    [Fact]
    public void SpawnRandomParadox_WithoutTrips_ReturnsNull()
    {
        var service = new ParadoxService(_context);

        Assert.Null(service.SpawnRandomParadox());
        Assert.Empty(_context.Paradoxes);
    }

    [Fact]
    public async Task SpawnRandomParadox_AddsParadoxToActiveTrip()
    {
        var trip = await CreateTripAsync();
        var service = new ParadoxService(_context);

        var result = service.SpawnRandomParadox(new Random(42));

        Assert.NotNull(result);
        Assert.Equal(trip.Guid, result!.Paradox.TripGuid);
        // The trip had no open paradox, so the new one is worked on immediately.
        Assert.Equal("InProcess", result.Paradox.ParadoxStatus);
        Assert.Equal(0, result.Paradox.QueuePosition);
        Assert.False(string.IsNullOrWhiteSpace(result.Paradox.Description));
        Assert.Equal(1, _context.Paradoxes.Count());
    }

    [Fact]
    public async Task AddParadoxToTrip_ThirdParadox_MakesTripCritical()
    {
        var trip = await CreateTripAsync();
        var service = new ParadoxService(_context);

        var first = service.AddParadoxToTrip(trip.Guid);
        var second = service.AddParadoxToTrip(trip.Guid);
        var third = service.AddParadoxToTrip(trip.Guid);

        Assert.False(first.TripBecameCritical);
        Assert.False(second.TripBecameCritical);
        Assert.True(third.TripBecameCritical);
        Assert.Equal(nameof(CriticalTrip), third.Paradox.TripType);
        Assert.Equal(1, _context.CriticalTrips.AsNoTracking().Count());
    }

    [Fact]
    public void AddParadoxToTrip_UnknownTrip_Throws()
    {
        var service = new ParadoxService(_context);

        Assert.Throws<ArgumentException>(() => service.AddParadoxToTrip(Guid.NewGuid()));
    }

    [Fact]
    public async Task GetFeed_ReturnsNewestFirstWithTripContext()
    {
        var trip = await CreateTripAsync("Victorian London");
        var service = new ParadoxService(_context);
        var older = service.AddParadoxToTrip(trip.Guid, ParadoxType.BootstrapParadox);
        await Task.Delay(20);
        var newer = service.AddParadoxToTrip(trip.Guid, ParadoxType.InformationParadox);

        var feed = service.GetFeed();

        Assert.Equal(2, feed.Count);
        Assert.Equal(newer.Paradox.Guid, feed[0].Guid);
        Assert.Equal(older.Paradox.Guid, feed[1].Guid);
        Assert.Equal("Victorian London", feed[0].TripName);
        Assert.Equal("InformationParadox", feed[0].ParadoxType);
    }

    [Fact]
    public void SimulationState_ClampsIntervalAndTracksSpawns()
    {
        var state = new ParadoxSimulationState(new ParadoxSimulationOptions { Enabled = true, IntervalSeconds = 1 });

        Assert.Equal(ParadoxSimulationState.MinIntervalSeconds, state.Snapshot().IntervalSeconds);

        state.Update(enabled: null, intervalSeconds: 99_999);
        Assert.Equal(ParadoxSimulationState.MaxIntervalSeconds, state.Snapshot().IntervalSeconds);

        state.RecordSpawn();
        state.RecordSpawn();
        var snapshot = state.Snapshot();
        Assert.Equal(2, snapshot.TotalSpawned);
        Assert.NotNull(snapshot.LastSpawnAt);
    }

    [Fact]
    public void SimulationState_Update_SignalsChangeAndHidesNextSpawnWhenDisabled()
    {
        var state = new ParadoxSimulationState(new ParadoxSimulationOptions { Enabled = true, IntervalSeconds = 30 });
        state.ScheduleNext(TimeSpan.FromSeconds(30));
        var changed = state.Changed;

        Assert.NotNull(state.Snapshot().NextSpawnAt);
        Assert.False(changed.IsCompleted);

        state.Update(enabled: false, intervalSeconds: null);

        Assert.True(changed.IsCompleted);
        Assert.False(state.Snapshot().Enabled);
        Assert.Null(state.Snapshot().NextSpawnAt);
    }
}
