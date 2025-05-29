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
        var customer = _context.Customers.FirstOrDefault(c => c.Guid == customerGuid);
        if (customer == null)
            throw new ArgumentException("Customer does not exist.");

        var trip = _context.Trips
            .Include(trip => trip.Customers)
            .FirstOrDefault(t => t.Guid == tripGuid);
        if (trip == null)
            throw new ArgumentException("Trip does not exist.");

        if (trip.Customers.Contains(customer))
            throw new InvalidOperationException("Trip is already booked.");

        if (trip.DateInRealLife < (DateTime.UtcNow - TimeSpan.FromHours(1)))
            throw new InvalidOperationException("Trip cannot be booked in the past or one hour before it starts.");

        trip.AddCustomer(customer);
        _context.SaveChanges();
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
                    p.ParadoxStatus,
                    p.ParadoxType)).ToList(),
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
                t.Manager.Guid))
            .ToList();

        return upcomingTrips;
    }
    
    public void TryCreateTripByManager(CreateTripByManagerCmd cmd, Guid managerGuid)
    {
        var manager = _context.Managers
            .FirstOrDefault(m => m.Guid == managerGuid);
        if (manager == null)
            throw new ArgumentException("Manager not found.");
    
        var licensedAgent = _context.LicensedAgents
            .FirstOrDefault(a => a.Guid == cmd.LicensedAgentGuid);
        if (licensedAgent == null)
            throw new ArgumentException("Licensed agent not found.");
        
        manager.CreateTrip(cmd.DateInRealLife, licensedAgent, cmd.TripName);
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

        manager.AddAgentToTrip(agent, trip);
    }
}