using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeTravelAgency.Application.Cmd;
using TimeTravelAgency.Application.Dto;
using TimeTravelAgency.Application.Infrastructure;
using TimeTravelAgency.Application.Model;
using TimeTravelAgency.Application.Service;

namespace TimeTravelAgency.Application.Controller;

[ApiController]
[Route("api/[controller]")]
public class ManagerController : ControllerBase
{
    private readonly TimeTravelAgencyContext _context;
    private readonly TripService _tripService;

    public ManagerController(TimeTravelAgencyContext context)
    {
        _context = context;
        _tripService = new TripService(_context);
    }

    [HttpPost]
    public async Task<IActionResult> CreateManager([FromBody] CreateManagerCmd cmd)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var manager = new Manager(
            cmd.Firstname,
            cmd.Lastname,
            cmd.Email,
            cmd.PhoneNumber,
            cmd.Address.ToModel()
        );

        _context.Managers.Add(manager);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetByGuid),
            new { guid = manager.Guid },
            new ManagerDto(
                manager.Guid,
                manager.Firstname,
                manager.Lastname,
                manager.Email,
                manager.PhoneNumber,
                new AddressDto(
                    manager.Address.Street,
                    manager.Address.City,
                    manager.Address.Zip
                )
            ));
    }

    [HttpPost("create-trip/{managerGuid}")]
    public ActionResult CreateTripByManager([FromBody] CreateTripByManagerCmd cmd, Guid managerGuid)
    {
        try
        {
            _tripService.TryCreateTripByManager(cmd, managerGuid);
            return Ok("Trip created successfully.");
        }
        catch (ArgumentException ex)
        {
            return Problem(ex.Message, statusCode: 400);
        }
    }
    
    [HttpGet("with-id")]
    public async Task<IActionResult> GetAllManagersWithId()
    {
        var managers = await _context.Managers
            .Include(m => m.Address)
            .ToListAsync();

        var managersDto = managers.Select(m => new ManagerWithIdDto(
            m.Guid,
            m.Id,
            m.Firstname,
            m.Lastname,
            m.Email,
            m.PhoneNumber,
            new AddressDto(
                m.Address.Street,
                m.Address.City,
                m.Address.Zip
            )
        )).ToList();

        return Ok(managersDto);
    }

    [HttpGet("get-agents-assigned-to-manager/{managerGuid}")]
    public IActionResult GetAgentsAssignedToManager(Guid managerGuid)
    {
        var manager = _context.Managers
            .Include(m => m.Agents)
            .FirstOrDefault(m => m.Guid == managerGuid);
        if (manager == null)
            return Problem("Manager was not found", statusCode: 404);

        var agentsDto = manager.Agents.Select(a => new AgentDto(
            a.Guid,
            a.Firstname,
            a.Lastname,
            a.DateOfBirth,
            a.SpecialisationTime,
            a.AgentType,
            a.ManagerId,
            a.SpecialisationEpoch,
            _context.Trips
                .Where(t => t.AgentId == a.Id)
                .Select(t => new TripDto(
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
                        p.ParadoxType
                    )).ToList(),
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
                            r.Content
                        )).ToList()
                    )).ToList(),
                    t.Reports.Select(r => new ReportForTripDto(
                        r.Guid,
                        r.Header,
                        r.Date,
                        r.Content
                    )).ToList(),
                    t.Reviews.Select(r => new ReviewDto(
                        r.Guid,
                        r.Stars,
                        r.Header,
                        r.Content
                    )).ToList().ToList(),
                    t.AgentId,
                    t.Manager.Guid
                )).ToList()
        ));

        return Ok(agentsDto);
    }

    [HttpGet]
    public async Task<IActionResult> GetAllManagers()
    {
        var managers = await _context.Managers
            .Include(m => m.Address)
            .ToListAsync();

        var managersDto = managers.Select(m => new ManagerDto(
            m.Guid,
            m.Firstname,
            m.Lastname,
            m.Email,
            m.PhoneNumber,
            new AddressDto(
                m.Address.Street,
                m.Address.City,
                m.Address.Zip
            )
        )).ToList();

        return Ok(managersDto);
    }

    [HttpGet("{guid}")]
    public IActionResult GetByGuid(Guid guid)
    {
        var manager = _context.Managers
            .FirstOrDefault(m => m.Guid == guid);

        if (manager == null)
            return Problem("Manager was not found", statusCode: 404);

        var managerDto = _context.Managers
            .Include(m => m.Address)
            .Include(m => m.Trips)
            .Where(m => m.Guid == guid)
            .Select(m => new ManagerDto(
                m.Guid,
                m.Firstname,
                m.Lastname,
                m.Email,
                m.PhoneNumber,
                new AddressDto(
                    m.Address.Street,
                    m.Address.City,
                    m.Address.Zip
                )
            )).FirstOrDefault();

        return Ok(managerDto);
    }

    [HttpPatch("assign-agent-to-trip/{managerGuid}/{agentGuid}/{tripGuid}")]
    public IActionResult AssignAgentToTrip(Guid managerGuid, Guid agentGuid, Guid tripGuid)
    {
        try
        {
            _tripService.TryAssignAgentToTrip(managerGuid, agentGuid, tripGuid);
            return Ok("Agent assigned to trip successfully.");
        }
        catch (ArgumentException ex)
        {
            return Problem(ex.Message, statusCode: 400);
        }
    }

    [HttpPatch("{guid}")]
    public async Task<IActionResult> UpdateManager(Guid guid, [FromBody] UpdateManagerCmd cmd)
    {
        var manager = _context.Managers
            .Include(m => m.Address)
            .FirstOrDefault(m => m.Guid == guid);

        if (manager == null)
            return Problem("Manager was not found", statusCode: 404);

        if (cmd.Firstname != null)
            manager.Firstname = cmd.Firstname;
        if (cmd.Lastname != null)
            manager.Lastname = cmd.Lastname;
        if (cmd.Email != null)
            manager.Email = cmd.Email;
        if (cmd.PhoneNumber != null)
            manager.PhoneNumber = cmd.PhoneNumber;
        if (cmd.Address != null)
            manager.Address = cmd.Address.ToModel();

        await _context.SaveChangesAsync();

        var managerDto = _context.Managers
            .Where(m => m.Guid == guid)
            .Select(m => new ManagerDto(
                m.Guid,
                m.Firstname,
                m.Lastname,
                m.Email,
                m.PhoneNumber,
                new AddressDto(
                    m.Address.Street,
                    m.Address.City,
                    m.Address.Zip
                )
            )).FirstOrDefault();

        return Ok(managerDto);
    }

    [HttpDelete("{guid}")]
    public async Task<IActionResult> DeleteManager(Guid guid)
    {
        var manager = await _context.Managers
            .Include(m => m.Address)
            .FirstOrDefaultAsync(m => m.Guid == guid);

        if (manager == null)
            return Problem("Manager was not found", statusCode: 404);

        var hasTrips = _context.Trips.Any(t => t.Manager.Id == manager.Id);
        if (hasTrips)
            return Problem("Manager cannot be deleted because they are assigned to one or more Trips.",
                statusCode: 400);


        _context.Managers.Remove(manager);
        await _context.SaveChangesAsync();

        return Ok($"Manager with GUID {guid} was successfully deleted.");
    }
}