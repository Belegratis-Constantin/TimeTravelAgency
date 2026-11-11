using Microsoft.EntityFrameworkCore;
using TimeTravelAgency.Application.Dto;
using TimeTravelAgency.Application.Infrastructure;
using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Application.Service;

public class ParadoxService
{
    /// <summary>A trip with this many paradoxes is automatically reclassified as <see cref="CriticalTrip"/>.</summary>
    public const int CriticalParadoxThreshold = 3;

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

    public SpawnParadoxResultDto AddParadoxToTrip(Guid tripGuid, ParadoxType? type = null)
    {
        var trip = _context.Trips
            .Include(t => t.Paradoxes)
            .Include(t => t.Manager)
            .FirstOrDefault(t => t.Guid == tripGuid)
            ?? throw new ArgumentException($"Trip {tripGuid} not found.");

        return AddParadox(trip, type);
    }

    /// <summary>Adds a paradox of random type to a random active trip. Returns null if no trip is eligible.</summary>
    public SpawnParadoxResultDto? SpawnRandomParadox(Random? random = null)
    {
        var candidates = _context.Trips
            .Where(t => t.TripStatus == TripStatus.Active)
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

        var paradox = _context.Paradoxes
            .Include(p => p.Trip)
            .ThenInclude(t => t.Manager)
            .FirstOrDefault(p => p.Guid == paradoxGuid)
            ?? throw new ArgumentException($"Paradox {paradoxGuid} not found.");

        if (managerGuid.HasValue && paradox.Trip.Manager.Guid != managerGuid.Value)
            throw new UnauthorizedAccessException("Manager does not own this paradox's trip.");

        paradox.ParadoxStatus = parsed;
        _context.SaveChanges();
    }

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

        var paradoxCount = _context.Paradoxes.Count(p => p.TripId == trip.Id);
        if (paradoxCount < CriticalParadoxThreshold) return false;

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
        p.Trip.AgentId
    );
}
