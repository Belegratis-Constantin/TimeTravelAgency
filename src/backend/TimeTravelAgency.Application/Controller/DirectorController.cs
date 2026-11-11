using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeTravelAgency.Application.Dto;
using TimeTravelAgency.Application.Infrastructure;
using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Application.Controller;

[ApiController]
[Route("api/[controller]")]
public class DirectorController : ControllerBase
{
    private readonly TimeTravelAgencyContext _context;

    public DirectorController(TimeTravelAgencyContext context)
    {
        _context = context;
    }

    [HttpGet]
    public IActionResult GetDirector()
    {
        var director = _context.Directors
            .Include(d => d.Managers)
            .FirstOrDefault();

        if (director == null)
            return Problem("No director found.", statusCode: 404);

        return Ok(new DirectorDto(director.Guid, director.Name, director.Managers.Count));
    }

    [HttpGet("{guid}/managers")]
    public IActionResult GetManagers(Guid guid)
    {
        var director = _context.Directors.FirstOrDefault(d => d.Guid == guid);
        if (director == null)
            return Problem("Director not found.", statusCode: 404);

        var managers = _context.Managers.ToList();
        var dto = managers.Select(m => new ManagerWithIdDto(
            m.Guid, m.Id, m.Firstname, m.Lastname, m.Email, m.PhoneNumber,
            new AddressDto(m.Address.Street, m.Address.City, m.Address.Zip)
        )).ToList();

        return Ok(dto);
    }

    [HttpGet("{guid}/agents")]
    public IActionResult GetAgents(Guid guid)
    {
        var director = _context.Directors.FirstOrDefault(d => d.Guid == guid);
        if (director == null)
            return Problem("Director not found.", statusCode: 404);

        var agents = _context.Agents.Include(a => a.SpecialisationEpoch).ToList();
        var dto = agents.Select(a => new AgentDto(
            a.Id, a.Guid, a.Firstname, a.Lastname, a.DateOfBirth,
            a.SpecialisationTime, a.AgentType, a.ManagerId, a.SpecialisationEpoch,
            _context.Trips
                .Where(t => t.AgentId == a.Id || t.LicensedAgentId == a.Id)
                .Select(t => new TripDto(
                    t.Guid, t.DateInRealLife, t.TripName, t.TripType,
                    t.TripStatus.ToString(), t.LicensedAgentId, t.ManagerId,
                    t.Paradoxes.Select(p => new ParadoxDto(p.Guid, p.ParadoxStatus.ToString(), p.ParadoxType.ToString())).ToList(),
                    new List<CustomerDto>(),
                    new List<ReportForTripDto>(),
                    new List<ReviewDto>(),
                    t.AgentId, t.Manager.Guid, t.DurationMinutes
                )).ToList()
        )).ToList();

        return Ok(dto);
    }

    [HttpGet("{guid}/stats")]
    public IActionResult GetStats(Guid guid)
    {
        var director = _context.Directors.FirstOrDefault(d => d.Guid == guid);
        if (director == null)
            return Problem("Director not found.", statusCode: 404);

        var stats = new SystemStatsDto(
            TotalTrips: _context.Trips.Count(),
            CriticalTripCount: _context.Trips.Count(t => t.TripType == "CriticalTrip"),
            TotalParadoxes: _context.Paradoxes.Count(),
            OpenParadoxes: _context.Paradoxes.Count(p => p.ParadoxStatus != ParadoxStatus.Solved),
            TotalManagers: _context.Managers.Count(),
            TotalAgents: _context.Agents.Count(),
            TotalCustomers: _context.Customers.Count()
        );

        return Ok(stats);
    }

    [HttpPatch("{directorGuid}/managers/{managerGuid}")]
    public IActionResult ReassignManager(Guid directorGuid, Guid managerGuid)
    {
        var director = _context.Directors
            .Include(d => d.Managers)
            .FirstOrDefault(d => d.Guid == directorGuid);
        if (director == null)
            return Problem("Director not found.", statusCode: 404);

        var manager = _context.Managers.FirstOrDefault(m => m.Guid == managerGuid);
        if (manager == null)
            return Problem("Manager not found.", statusCode: 404);

        director.AddManager(manager);
        _context.SaveChanges();

        return Ok("Manager reassigned to director.");
    }
}
