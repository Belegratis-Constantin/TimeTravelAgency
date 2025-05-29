using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeTravelAgency.Application.Dto;
using TimeTravelAgency.Application.Infrastructure;
using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Application.Controller;

[ApiController]
[Route("api/[controller]")]
public class AgentController : ControllerBase
{
    private readonly TimeTravelAgencyContext _context;

    public AgentController(TimeTravelAgencyContext context)
    {
        _context = context;
    }

    [HttpGet("{guid}")]
    public async Task<IActionResult> GetById(Guid guid)
    {
        var agent = await _context.Agents
            .Include(a => a.SpecialisationEpoch)
            .FirstOrDefaultAsync(a => a.Guid == guid);

        if (agent == null)
            return Problem("Agent was not found", statusCode: 404);

        var tripDto = await _context.Trips
            .Where(t => t.AgentId == agent.Id)
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
                )).ToList(),
                t.AgentId,
                t.Manager.Guid
            )).ToListAsync();

        return Ok(new AgentDto(
            agent.Guid,
            agent.Firstname,
            agent.Lastname,
            agent.DateOfBirth,
            agent.SpecialisationTime,
            agent.AgentType,
            agent.ManagerId,
            agent.SpecialisationEpoch,
            tripDto
        ));
    }

    [HttpGet]
    public async Task<ActionResult<List<AgentDto>>> GetAllAgents()
    {
        var agents = await _context.Agents
            .Include(a => a.SpecialisationEpoch)
            .ToListAsync();

        var agentsDto = agents.Select(a => new AgentDto(
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
                    )).ToList(),
                    t.AgentId,
                    t.Manager.Guid
                )).ToList()
        ));

        return Ok(agentsDto);
    }

    [HttpDelete("{guid}")]
    public async Task<ActionResult> DeleteAgent(Guid guid)
    {
        var agent = await _context.Agents
            .FirstOrDefaultAsync(a => a.Guid == guid);
        if (agent == null)
            return Problem($"Agent was not found", statusCode: 404);

        var hasTrips = await _context.Trips
            .AnyAsync(t => t.AgentId == agent.Id);
        if (hasTrips)
            return Problem("Agent cannot be deleted because they are associated with one or more trips.",
                statusCode: 400);

        _context.Agents.Remove(agent);
        await _context.SaveChangesAsync();

        return Ok($"Agent with GUID {guid} was successfully deleted.");
    }
}