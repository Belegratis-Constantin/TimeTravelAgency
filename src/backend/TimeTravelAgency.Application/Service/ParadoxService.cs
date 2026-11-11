using Microsoft.EntityFrameworkCore;
using TimeTravelAgency.Application.Dto;
using TimeTravelAgency.Application.Infrastructure;
using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Application.Service;

/// <summary>
/// Paradoxes only emerge on trips that are currently under way (<see cref="TripStatus.Active"/>).
/// A running trip with <see cref="CriticalParadoxThreshold"/> unresolved paradoxes is reclassified as <see cref="CriticalTrip"/>.
/// Agents on the trip stabilise paradoxes in the field (engage → resolve / fail).
/// </summary>
public class ParadoxService
{
    /// <summary>A running trip with this many unresolved paradoxes is automatically reclassified as <see cref="CriticalTrip"/>.</summary>
    public const int CriticalParadoxThreshold = 3;

    /// <summary>The simulation leaves a trip alone once it already has this many unresolved paradoxes.</summary>
    public const int MaxOpenParadoxesPerTrip = 4;

    private readonly TimeTravelAgencyContext _context;

    public ParadoxService(TimeTravelAgencyContext context)
    {
        _context = context;
    }

    public List<ParadoxFeedDto> GetFeed()
    {
        return _context.Paradoxes
            .Include(p => p.Trip)
            .ThenInclude(t => t.Manager)
            .AsNoTracking()
            .ToList()
            .OrderByDescending(p => p.CreatedAt)
            .Select(ToFeedDto)
            .ToList();
    }

    /// <exception cref="ArgumentException">Trip not found.</exception>
    /// <exception cref="InvalidOperationException">Trip is not under way.</exception>
    public SpawnParadoxResultDto AddParadoxToTrip(Guid tripGuid, ParadoxType? type = null)
    {
        var trip = _context.Trips
            .Include(t => t.Paradoxes)
            .Include(t => t.Manager)
            .FirstOrDefault(t => t.Guid == tripGuid)
            ?? throw new ArgumentException($"Trip {tripGuid} not found.");

        if (trip.StatusAt(DateTime.UtcNow) != TripStatus.Active)
            throw new InvalidOperationException("Paradoxes only emerge while a trip is under way.");

        return AddParadox(trip, type);
    }

    /// <summary>
    /// Adds a paradox of random type to a random running trip that is not already saturated with open paradoxes.
    /// Returns null if no trip is eligible.
    /// </summary>
    public SpawnParadoxResultDto? SpawnRandomParadox(Random? random = null)
    {
        var now = DateTime.UtcNow;
        var candidates = _context.Trips
            .Include(t => t.Paradoxes)
            .Where(t => t.TripStatus != TripStatus.Cancelled && t.TripStatus != TripStatus.Completed && t.DateInRealLife <= now)
            .AsNoTracking()
            .ToList()
            .Where(t => t.StatusAt(now) == TripStatus.Active)
            .Where(t => t.Paradoxes.Count(p => p.IsOpen) < MaxOpenParadoxesPerTrip)
            .Select(t => t.Guid)
            .ToList();

        if (candidates.Count == 0) return null;

        var guid = candidates[(random ?? Random.Shared).Next(candidates.Count)];
        return AddParadoxToTrip(guid);
    }

    public void ChangeStatus(Guid paradoxGuid, string status, Guid? managerGuid = null)
    {
        if (!Enum.TryParse<ParadoxStatus>(status, ignoreCase: true, out var parsed))
            throw new ArgumentException($"Unknown status '{status}'. Valid values: InQueue, InProcess, Solved, Escalated.");

        var paradox = LoadParadox(paradoxGuid);

        if (managerGuid.HasValue && paradox.Trip.Manager.Guid != managerGuid.Value)
            throw new UnauthorizedAccessException("Manager does not own this paradox's trip.");

        // An escalated paradox only collapses through the agents' dual lock — it cannot be signed off as solved.
        if (parsed == ParadoxStatus.Solved && paradox.DualLockRequired && paradox.IsOpen)
            throw new InvalidOperationException(
                "An escalated paradox can only be solved in the field: the licensed and the support agent need a dual lock.");

        paradox.SetStatus(parsed);
        _context.SaveChanges();
    }

    /// <summary>
    /// An agent on the trip starts stabilising the paradox (status → InProcess).
    /// An escalated paradox needs a dual lock, so only the trip's licensed and support agent can engage it —
    /// and only once a support agent is assigned.
    /// </summary>
    public ParadoxFeedDto Engage(Guid paradoxGuid, Guid agentGuid)
    {
        var (paradox, agent) = LoadForAgent(paradoxGuid, agentGuid);
        if (paradox.DualLockRequired) DualLockRoleOf(paradox.Trip, agent);

        if (paradox.ParadoxStatus != ParadoxStatus.InProcess)
        {
            paradox.SetStatus(ParadoxStatus.InProcess);
            _context.SaveChanges();
        }
        return ToFeedDto(paradox);
    }

    /// <summary>
    /// The agent won the stabilisation round. Only possible while the paradox is in process.
    /// Normally that solves the paradox; with a dual lock it only records this agent's lock, and the paradox is
    /// solved once the partner's lock holds as well.
    /// </summary>
    public ParadoxFeedDto Resolve(Guid paradoxGuid, Guid agentGuid)
    {
        var (paradox, agent) = LoadForAgent(paradoxGuid, agentGuid);

        if (paradox.DualLockRequired)
            paradox.RegisterLock(DualLockRoleOf(paradox.Trip, agent), agent);
        else
        {
            RequireInProcess(paradox);
            paradox.SetStatus(ParadoxStatus.Solved, agent);
        }

        _context.SaveChanges();
        return ToFeedDto(paradox);
    }

    /// <summary>
    /// The stabilisation round was lost — the paradox is escalated to the trip's manager and from then on needs a
    /// dual lock. If a dual lock was already under way, both locks break: licensed and support agent start over.
    /// Only possible while the paradox is in process.
    /// </summary>
    public ParadoxFeedDto Fail(Guid paradoxGuid, Guid agentGuid)
    {
        var (paradox, agent) = LoadForAgent(paradoxGuid, agentGuid);
        if (paradox.DualLockRequired) DualLockRoleOf(paradox.Trip, agent);
        RequireInProcess(paradox);

        paradox.SetStatus(ParadoxStatus.Escalated);
        _context.SaveChanges();
        return ToFeedDto(paradox);
    }

    /// <exception cref="UnauthorizedAccessException">Agent is neither the licensed nor the support agent.</exception>
    /// <exception cref="InvalidOperationException">The trip has no support agent yet.</exception>
    private static DualLockRole DualLockRoleOf(Trip trip, Agent agent)
    {
        if (trip.AgentId == null)
            throw new InvalidOperationException(
                "This escalated paradox needs a dual lock — the manager has to assign a support agent to the trip first.");
        if (trip.LicensedAgentId == agent.Id) return DualLockRole.Licensed;
        if (trip.AgentId == agent.Id) return DualLockRole.Support;
        throw new UnauthorizedAccessException("A dual lock needs the trip's licensed agent and its support agent.");
    }

    private Paradox LoadParadox(Guid paradoxGuid) =>
        _context.Paradoxes
            .Include(p => p.Trip)
            .ThenInclude(t => t.Manager)
            .FirstOrDefault(p => p.Guid == paradoxGuid)
        ?? throw new ArgumentException($"Paradox {paradoxGuid} not found.");

    /// <exception cref="ArgumentException">Paradox or agent not found.</exception>
    /// <exception cref="UnauthorizedAccessException">Agent is not on the paradox's trip.</exception>
    /// <exception cref="InvalidOperationException">Paradox is already solved.</exception>
    private (Paradox paradox, Agent agent) LoadForAgent(Guid paradoxGuid, Guid agentGuid)
    {
        var paradox = LoadParadox(paradoxGuid);
        var agent = _context.Agents.FirstOrDefault(a => a.Guid == agentGuid)
                    ?? throw new ArgumentException($"Agent {agentGuid} not found.");

        if (!IsOnTrip(paradox.Trip, agent))
            throw new UnauthorizedAccessException("Only agents assigned to this trip can stabilise its paradoxes.");

        if (!paradox.IsOpen)
            throw new InvalidOperationException("This paradox has already been stabilised.");

        return (paradox, agent);
    }

    /// <exception cref="InvalidOperationException">Paradox is not being worked on (InProcess).</exception>
    private static void RequireInProcess(Paradox paradox)
    {
        if (paradox.ParadoxStatus != ParadoxStatus.InProcess)
            throw new InvalidOperationException("A paradox can only be stabilised while it is in process — engage it first.");
    }

    private static bool IsOnTrip(Trip trip, Agent agent) =>
        trip.LicensedAgentId == agent.Id
        || trip.AgentId == agent.Id
        || (trip is CriticalTrip critical && critical.LicensedSupportAgentId == agent.Id);

    private SpawnParadoxResultDto AddParadox(Trip trip, ParadoxType? type)
    {
        var paradox = new Paradox(trip, type);
        _context.Paradoxes.Add(paradox);
        _context.SaveChanges();

        var becameCritical = TryAutoClassify(trip);
        var dto = ToFeedDto(paradox) with { TripType = becameCritical ? nameof(CriticalTrip) : trip.TripType };

        return new SpawnParadoxResultDto(dto, becameCritical);
    }

    private bool TryAutoClassify(Trip trip)
    {
        if (trip is CriticalTrip || trip.TripType == nameof(CriticalTrip)) return false;

        // Only a trip that is under way can become critical.
        if (trip.StatusAt(DateTime.UtcNow) != TripStatus.Active) return false;

        var openParadoxes = _context.Paradoxes.Count(p => p.TripId == trip.Id && p.ParadoxStatus != ParadoxStatus.Solved);
        if (openParadoxes < CriticalParadoxThreshold) return false;

        // TPH discriminator change: EF cannot change an entity's CLR type, so update the row directly.
        // The trip's own licensed agent becomes the support agent (non-null FK requirement).
        _context.Database.ExecuteSqlRaw(
            "UPDATE Trips SET TripType = 'CriticalTrip', LicensedSupportAgentId = {0} WHERE Id = {1}",
            trip.LicensedAgentId, trip.Id);

        // Evict so the next read materializes as CriticalTrip
        _context.Entry(trip).State = EntityState.Detached;
        return true;
    }

    private static ParadoxFeedDto ToFeedDto(Paradox p) => new(
        p.Guid,
        p.ParadoxStatus.ToString(),
        p.ParadoxType.ToString(),
        p.ParadoxDescription,
        DateTime.SpecifyKind(p.CreatedAt, DateTimeKind.Utc),
        p.Trip.Guid,
        p.Trip.TripName,
        p.Trip.TripType,
        p.Trip.Manager.Guid,
        p.Trip.LicensedAgentId,
        p.Trip.AgentId,
        p.Trip.StatusAt(DateTime.UtcNow).ToString(),
        p.ResolvedAt.HasValue ? DateTime.SpecifyKind(p.ResolvedAt.Value, DateTimeKind.Utc) : null,
        p.ResolvedByAgentId,
        p.DualLockRequired,
        p.LicensedLockAt.HasValue,
        p.SupportLockAt.HasValue,
        p.Trip.AgentId.HasValue
    );
}
