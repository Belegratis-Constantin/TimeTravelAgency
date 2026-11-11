using Microsoft.EntityFrameworkCore;
using TimeTravelAgency.Application.Cmd;
using TimeTravelAgency.Application.Dto;
using TimeTravelAgency.Application.Infrastructure;
using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Application.Service;

public class TripService
{
    private readonly TimeTravelAgencyContext _context;

    public TripService(TimeTravelAgencyContext context)
    {
        _context = context;
    }

    public void TryBookTrip(Guid customerGuid, Guid tripGuid)
    {
        var (customer, trip) = LoadBooking(customerGuid, tripGuid);

        // Throws InvalidOperationException when the trip is not bookable or overlaps another booking.
        customer.AssignToTrip(trip);
        _context.SaveChanges();
    }

    public void TryCancelBooking(Guid customerGuid, Guid tripGuid)
    {
        var (customer, trip) = LoadBooking(customerGuid, tripGuid);

        // Throws InvalidOperationException when not booked or too close to departure.
        customer.CheckOutOfTrip(trip);
        _context.SaveChanges();
    }

    private (Customer customer, Trip trip) LoadBooking(Guid customerGuid, Guid tripGuid)
    {
        var customer = _context.Customers
            .Include(c => c.Trips)
            .FirstOrDefault(c => c.Guid == customerGuid)
            ?? throw new ArgumentException("Customer does not exist.");

        var trip = _context.Trips
            .Include(t => t.Customers)
            .FirstOrDefault(t => t.Guid == tripGuid)
            ?? throw new ArgumentException("Trip does not exist.");

        return (customer, trip);
    }

    public List<TripDto> GetUpcomingTrips(bool sorted = true)
    {
        var query = _context.Trips
            .Include(t => t.Agent)
            .Include(t => t.Manager)
            .Include(t => t.Customers)
            .ThenInclude(c => c.Address)
            .Include(t => t.Customers)
            .ThenInclude(c => c.Reviews)
            .Include(t => t.Paradoxes)
            .Include(t => t.Reports)
            .Include(t => t.Reviews)
            .Where(t => t.DateInRealLife > DateTime.UtcNow);

        if (sorted)
        {
            query = query.OrderBy(t => t.DateInRealLife);
        }

        var upcomingTrips = query
            .Select(t => new TripDto
            (
                t.Guid,
                t.DateInRealLife,
                t.TripName,
                t.TripType,
                t.TripStatus.ToString(),
                t.LicensedAgentId,
                t.ManagerId,
                t.Paradoxes.Select(p => new ParadoxDto(
                    p.Guid,
                    p.ParadoxStatus.ToString(),
                    p.ParadoxType.ToString())).ToList(),
                t.Customers.Select(c => new CustomerDto(
                    c.Guid,
                    c.Firstname,
                    c.Lastname,
                    c.Email,
                    c.PhoneNumber,
                    c.DateOfBirth,
                    new AddressDto(
                        c.Address.Street,
                        c.Address.City,
                        c.Address.Zip
                    ),
                    c.Reviews.Select(r => new ReviewDto(
                        r.Guid,
                        r.Stars,
                        r.Header,
                        r.Content)
                    ).ToList()
                )).ToList(),
                t.Reports.Select(r => new ReportForTripDto(
                    r.Guid,
                    r.Header,
                    r.Date,
                    r.Content)
                ).ToList(),
                t.Reviews.Select(r => new ReviewDto(
                    r.Guid,
                    r.Stars,
                    r.Header,
                    r.Content)
                ).ToList(), 
                t.AgentId,
                t.Manager.Guid,
                t.DurationMinutes))
            .ToList();

        return upcomingTrips;
    }
    
    public void TryCreateTripByManager(CreateTripByManagerCmd cmd, Guid managerGuid)
    {
        var manager = _context.Managers
            .Include(m => m.Trips)
            .FirstOrDefault(m => m.Guid == managerGuid);
        if (manager == null)
            throw new ArgumentException("Manager not found.");
    
        var licensedAgent = _context.LicensedAgents
            .Include(a => a.Trips)
            .FirstOrDefault(a => a.Guid == cmd.LicensedAgentGuid);
        if (licensedAgent == null)
            throw new ArgumentException("Licensed agent not found.");
        
        if (cmd.DateInRealLife.ToUniversalTime() <= DateTime.UtcNow)
            throw new InvalidOperationException("A new trip must depart in the future.");

        // Throws InvalidOperationException when the manager already runs the maximum number of open trips
        // or the licensed agent is already on a trip at that time.
        manager.CreateTrip(cmd.DateInRealLife.ToUniversalTime(), licensedAgent, cmd.TripName, cmd.DurationMinutes);
        _context.SaveChanges();
    }

    public void TryAssignAgentToTrip(Guid managerGuid, Guid agentGuid, Guid tripGuid)
    {
        var manager = _context.Managers
            .Include(m => m.Agents)
            .FirstOrDefault(m => m.Guid == managerGuid);
        if (manager == null)
            throw new ArgumentException("Manager not found.");
        
        var agent = _context.Agents
            .FirstOrDefault(a => a.Guid == agentGuid);
        if (agent == null)
            throw new ArgumentException("Agent not found.");
        
        var trip = _context.Trips
            .Include(t => t.LicensedAgent)
            .FirstOrDefault(t => t.Guid == tripGuid);
        if (trip == null)
            throw new ArgumentException("Trip not found.");

        // Throws InvalidOperationException when the trip already has a support agent.
        manager.AddAgentToTrip(agent, trip);
        _context.SaveChanges();
    }
}