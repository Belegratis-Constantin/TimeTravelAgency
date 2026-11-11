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
        service.Engage(first.Paradox.Guid, agent.Guid);
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

    [Theory]
    [InlineData(ParadoxStatus.InQueue)]
    [InlineData(ParadoxStatus.Escalated)]
    public async Task Agent_CannotResolveOrFail_WhenNotInProcess(ParadoxStatus status)
    {
        var (trip, agent) = await CreateTripAsync(TimeSpan.FromMinutes(-5));
        var service = new ParadoxService(_context);
        var current = service.AddParadoxToTrip(trip.Guid);
        var queued = service.AddParadoxToTrip(trip.Guid);
        var target = status == ParadoxStatus.InQueue ? queued.Paradox.Guid : current.Paradox.Guid;
        if (status != ParadoxStatus.InQueue) service.ChangeStatus(target, status.ToString());

        Assert.Throws<InvalidOperationException>(() => service.Resolve(target, agent.Guid));
        Assert.Throws<InvalidOperationException>(() => service.Fail(target, agent.Guid));
        Assert.Equal(status, _context.Paradoxes.AsNoTracking().Single(p => p.Guid == target).ParadoxStatus);
    }

    [Fact]
    public async Task Agent_Fail_EscalatesParadox_AndRequiresDualLock()
    {
        var (trip, agent) = await CreateTripAsync(TimeSpan.FromMinutes(-5));
        var service = new ParadoxService(_context);
        var spawned = service.AddParadoxToTrip(trip.Guid);

        service.Engage(spawned.Paradox.Guid, agent.Guid);
        var escalated = service.Fail(spawned.Paradox.Guid, agent.Guid);

        Assert.Equal("Escalated", escalated.ParadoxStatus);
        Assert.True(escalated.DualLockRequired);
        // An escalated paradox can neither be solved directly nor be engaged without a support agent on the trip.
        Assert.Throws<InvalidOperationException>(() => service.Resolve(spawned.Paradox.Guid, agent.Guid));
        Assert.Throws<InvalidOperationException>(() => service.Engage(spawned.Paradox.Guid, agent.Guid));
    }

    [Fact]
    public async Task DualLock_BothAgentsWin_SolvesParadox()
    {
        var (trip, licensed, support) = await CreateDualTripAsync();
        var service = new ParadoxService(_context);
        var guid = await EscalatedParadoxAsync(service, trip, licensed);

        service.Engage(guid, licensed.Guid);
        var half = service.Resolve(guid, licensed.Guid);
        Assert.Equal("InProcess", half.ParadoxStatus);
        Assert.True(half.LicensedLocked);
        Assert.False(half.SupportLocked);
        Assert.Throws<InvalidOperationException>(() => service.Resolve(guid, licensed.Guid));

        service.Engage(guid, support.Guid);
        var solved = service.Resolve(guid, support.Guid);
        Assert.Equal("Solved", solved.ParadoxStatus);
        Assert.Equal(support.Id, solved.ResolvedByAgentId);
    }

    [Fact]
    public async Task DualLock_OneAgentLoses_BothHaveToRepeat()
    {
        var (trip, licensed, support) = await CreateDualTripAsync();
        var service = new ParadoxService(_context);
        var guid = await EscalatedParadoxAsync(service, trip, licensed);

        service.Engage(guid, licensed.Guid);
        service.Resolve(guid, licensed.Guid);
        var lost = service.Fail(guid, support.Guid);

        Assert.Equal("Escalated", lost.ParadoxStatus);
        Assert.False(lost.LicensedLocked);
        Assert.False(lost.SupportLocked);

        // Support alone is not enough after the reset — the licensed agent has to lock again too.
        service.Engage(guid, support.Guid);
        Assert.Equal("InProcess", service.Resolve(guid, support.Guid).ParadoxStatus);
        Assert.Equal("Solved", service.Resolve(guid, licensed.Guid).ParadoxStatus);
    }

    [Fact]
    public async Task DualLock_OtherAgent_IsRejected()
    {
        var (trip, licensed, _) = await CreateDualTripAsync();
        var service = new ParadoxService(_context);
        var guid = await EscalatedParadoxAsync(service, trip, licensed);
        var outsider = await CreateOutsiderAsync();

        Assert.Throws<UnauthorizedAccessException>(() => service.Engage(guid, outsider.Guid));
    }

    [Fact]
    public async Task ManagerEscalation_AlsoRequiresDualLock()
    {
        var (trip, licensed, _) = await CreateDualTripAsync();
        var service = new ParadoxService(_context);
        var spawned = service.AddParadoxToTrip(trip.Guid);

        service.ChangeStatus(spawned.Paradox.Guid, "Escalated");
        service.Engage(spawned.Paradox.Guid, licensed.Guid);

        Assert.Equal("InProcess", service.Resolve(spawned.Paradox.Guid, licensed.Guid).ParadoxStatus);
    }

    [Fact]
    public async Task Manager_CannotSolveEscalatedParadox()
    {
        var (trip, licensed, _) = await CreateDualTripAsync();
        var service = new ParadoxService(_context);
        var guid = await EscalatedParadoxAsync(service, trip, licensed);

        Assert.Throws<InvalidOperationException>(() => service.ChangeStatus(guid, "Solved"));
        Assert.Equal(ParadoxStatus.Escalated, _context.Paradoxes.AsNoTracking().Single().ParadoxStatus);

        // Other status changes stay allowed, and a normal paradox can still be signed off.
        service.ChangeStatus(guid, "InProcess");
        var normal = service.AddParadoxToTrip(trip.Guid);
        service.ChangeStatus(normal.Paradox.Guid, "Solved");
    }

    [Fact]
    public async Task Queue_NewParadoxes_LineUpBehindTheCurrentOne()
    {
        var (trip, _) = await CreateTripAsync(TimeSpan.FromMinutes(-5));
        var service = new ParadoxService(_context);

        var first = service.AddParadoxToTrip(trip.Guid).Paradox;
        var second = service.AddParadoxToTrip(trip.Guid).Paradox;
        var third = service.AddParadoxToTrip(trip.Guid).Paradox;

        Assert.Equal(("InProcess", 0), (first.ParadoxStatus, first.QueuePosition!.Value));
        Assert.Equal(("InQueue", 1), (second.ParadoxStatus, second.QueuePosition!.Value));
        Assert.Equal(("InQueue", 2), (third.ParadoxStatus, third.QueuePosition!.Value));
    }

    [Fact]
    public async Task Queue_SolvingTheCurrentParadox_PromotesTheNextOne()
    {
        var (trip, agent) = await CreateTripAsync(TimeSpan.FromMinutes(-5));
        var service = new ParadoxService(_context);
        var first = service.AddParadoxToTrip(trip.Guid).Paradox.Guid;
        var second = service.AddParadoxToTrip(trip.Guid).Paradox.Guid;
        var third = service.AddParadoxToTrip(trip.Guid).Paradox.Guid;

        // A queued paradox cannot be taken over — it is not its turn yet.
        Assert.Throws<InvalidOperationException>(() => service.Engage(second, agent.Guid));

        service.Engage(first, agent.Guid);
        var solved = service.Resolve(first, agent.Guid);

        Assert.Null(solved.QueuePosition);
        var feed = service.GetFeed().ToDictionary(p => p.Guid);
        Assert.Equal(("InProcess", 0), (feed[second].ParadoxStatus, feed[second].QueuePosition!.Value));
        Assert.Equal(("InQueue", 1), (feed[third].ParadoxStatus, feed[third].QueuePosition!.Value));

        // The promoted paradox is in process right away — no engage needed.
        Assert.Equal("Solved", service.Resolve(second, agent.Guid).ParadoxStatus);
        Assert.Equal("InProcess", Status(service, third));
    }

    [Fact]
    public async Task Queue_ManagerMovesParadoxToTheFront_PreviousOneGoesBackToTheQueue()
    {
        var (trip, agent) = await CreateTripAsync(TimeSpan.FromMinutes(-5));
        var service = new ParadoxService(_context);
        var first = service.AddParadoxToTrip(trip.Guid).Paradox.Guid;
        service.AddParadoxToTrip(trip.Guid);
        var third = service.AddParadoxToTrip(trip.Guid).Paradox.Guid;

        var moved = service.MoveInQueue(third, 0, trip.Manager.Guid);

        Assert.Equal(("InProcess", 0), (moved.ParadoxStatus, moved.QueuePosition!.Value));
        var feed = service.GetFeed().Where(p => p.QueuePosition.HasValue).OrderBy(p => p.QueuePosition).ToList();
        Assert.Equal([third, first], feed.Take(2).Select(p => p.Guid));
        Assert.Equal("InQueue", feed[1].ParadoxStatus);
        Assert.Equal([0, 1, 2], feed.Select(p => p.QueuePosition!.Value));

        // The agent now works on the paradox the manager chose; the former one has to wait.
        Assert.Throws<InvalidOperationException>(() => service.Resolve(first, agent.Guid));
        Assert.Equal("Solved", service.Resolve(third, agent.Guid).ParadoxStatus);
        Assert.Equal("InProcess", service.GetFeed().Single(p => p.Guid == first).ParadoxStatus);
    }

    [Fact]
    public async Task Queue_ManagerStatusChange_KeepsExactlyOneParadoxInProcess()
    {
        var (trip, _) = await CreateTripAsync(TimeSpan.FromMinutes(-5));
        var service = new ParadoxService(_context);
        var first = service.AddParadoxToTrip(trip.Guid).Paradox.Guid;
        var second = service.AddParadoxToTrip(trip.Guid).Paradox.Guid;

        // "In process" means "do this one now".
        service.ChangeStatus(second, "InProcess");
        Assert.Equal("InQueue", Status(service, first));
        Assert.Equal("InProcess", Status(service, second));

        // Back to the queue → lined up at the end, the other one moves up.
        service.ChangeStatus(second, "InQueue");
        Assert.Equal("InProcess", Status(service, first));
        Assert.Equal("InQueue", Status(service, second));

        // Signing off the current one promotes the next.
        service.ChangeStatus(first, "Solved");
        Assert.Equal("InProcess", Status(service, second));
    }

    [Fact]
    public async Task Queue_OtherManager_CannotReorder()
    {
        var (trip, _) = await CreateTripAsync(TimeSpan.FromMinutes(-5));
        var service = new ParadoxService(_context);
        service.AddParadoxToTrip(trip.Guid);
        var second = service.AddParadoxToTrip(trip.Guid).Paradox.Guid;

        Assert.Throws<UnauthorizedAccessException>(() => service.MoveInQueue(second, 0, Guid.NewGuid()));
        Assert.Equal("InQueue", Status(service, second));
    }

    [Fact]
    public async Task Queue_EscalatedParadoxLosesItsTurn_KeepsDualLockButLosesProgress()
    {
        var (trip, licensed, _) = await CreateDualTripAsync();
        var service = new ParadoxService(_context);
        var escalated = await EscalatedParadoxAsync(service, trip, licensed);
        var other = service.AddParadoxToTrip(trip.Guid).Paradox.Guid;
        service.Engage(escalated, licensed.Guid);
        service.Resolve(escalated, licensed.Guid); // licensed lock holds

        service.MoveInQueue(other, 0, trip.Manager.Guid);

        var queued = service.GetFeed().Single(p => p.Guid == escalated);
        Assert.Equal("InQueue", queued.ParadoxStatus);
        Assert.True(queued.DualLockRequired);
        Assert.False(queued.LicensedLocked);
        Assert.Equal("InProcess", Status(service, other));
    }

    private static string Status(ParadoxService service, Guid paradox) =>
        service.GetFeed().Single(p => p.Guid == paradox).ParadoxStatus;

    /// <summary>Spawns a paradox and lets the licensed agent lose a round, so it is escalated.</summary>
    private static Task<Guid> EscalatedParadoxAsync(ParadoxService service, Trip trip, LicensedAgent licensed)
    {
        var spawned = service.AddParadoxToTrip(trip.Guid);
        service.Engage(spawned.Paradox.Guid, licensed.Guid);
        service.Fail(spawned.Paradox.Guid, licensed.Guid);
        return Task.FromResult(spawned.Paradox.Guid);
    }

    /// <summary>A running trip with a licensed agent and an assigned support agent.</summary>
    private async Task<(Trip trip, LicensedAgent licensed, Agent support)> CreateDualTripAsync()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", Addr);
        var licensed = new LicensedAgent("Karl", "Mayer", DateTime.UtcNow.AddYears(-30), 2025, 7, DateTime.UtcNow.AddYears(1), Addr);
        var support = new Agent("Susi", "Stütz", DateTime.UtcNow.AddYears(-28), 2025, Addr);
        _context.Managers.Add(manager);
        _context.LicensedAgents.Add(licensed);
        _context.Agents.Add(support);
        await _context.SaveChangesAsync();

        manager.AddAgent(support);
        var trip = manager.CreateTrip(DateTime.UtcNow.AddMinutes(-5), licensed, "Ancient Rome", durationMinutes: 120);
        manager.AddAgentToTrip(support, trip);
        await _context.SaveChangesAsync();
        return (trip, licensed, support);
    }

    [Fact]
    public async Task Agent_NotOnTrip_CannotResolve()
    {
        var (trip, _) = await CreateTripAsync(TimeSpan.FromMinutes(-5));
        var outsider = await CreateOutsiderAsync();
        var service = new ParadoxService(_context);
        var spawned = service.AddParadoxToTrip(trip.Guid);

        Assert.Throws<UnauthorizedAccessException>(() => service.Engage(spawned.Paradox.Guid, outsider.Guid));
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
