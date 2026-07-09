using Microsoft.EntityFrameworkCore;
using TimeTravelAgency.Application.Infrastructure;
using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Application.Service;

public class ParadoxService
{
    private readonly TimeTravelAgencyContext _context;

    public ParadoxService(TimeTravelAgencyContext context)
    {
        _context = context;
    }

    public Paradox AddParadoxToTrip(Guid tripGuid)
    {
        var trip = _context.Trips
            .Include(t => t.Paradoxes)
            .FirstOrDefault(t => t.Guid == tripGuid)
            ?? throw new ArgumentException($"Trip {tripGuid} not found.");

        var paradox = new Paradox(trip);
        _context.Paradoxes.Add(paradox);
        _context.SaveChanges();

        TryAutoClassify(trip);

        return paradox;
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

    private void TryAutoClassify(Trip trip)
    {
        if (trip is CriticalTrip) return;

        // Reload count from DB to be accurate
        var paradoxCount = _context.Paradoxes.Count(p => p.TripId == trip.Id);
        if (paradoxCount < 3) return;

        // Use the trip's own licensed agent as the support agent (non-null FK requirement)
        _context.Database.ExecuteSqlRaw(
            "UPDATE Trips SET TripType = 'CriticalTrip', LicensedSupportAgentId = {0} WHERE Id = {1}",
            trip.LicensedAgentId, trip.Id);

        // Evict so next read materializes as CriticalTrip
        _context.Entry(trip).State = EntityState.Detached;
    }
}
