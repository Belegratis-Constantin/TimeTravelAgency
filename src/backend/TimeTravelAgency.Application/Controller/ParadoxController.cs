using Microsoft.AspNetCore.Mvc;
using TimeTravelAgency.Application.Cmd;
using TimeTravelAgency.Application.Dto;
using TimeTravelAgency.Application.Infrastructure;
using TimeTravelAgency.Application.Service;

namespace TimeTravelAgency.Application.Controller;

[ApiController]
[Route("api/[controller]")]
public class ParadoxController : ControllerBase
{
    private readonly TimeTravelAgencyContext _context;
    private readonly ParadoxService _paradoxService;

    public ParadoxController(TimeTravelAgencyContext context)
    {
        _context = context;
        _paradoxService = new ParadoxService(context);
    }

    [HttpPost("trip/{tripGuid}")]
    public IActionResult AddParadox(Guid tripGuid)
    {
        try
        {
            var paradox = _paradoxService.AddParadoxToTrip(tripGuid);

            var tripAfter = _context.Trips.FirstOrDefault(t => t.Guid == tripGuid);
            return Ok(new
            {
                paradox = new ParadoxDto(paradox.Guid, paradox.ParadoxStatus.ToString(), paradox.ParadoxType.ToString()),
                tripBecameCritical = tripAfter?.TripType == "CriticalTrip"
            });
        }
        catch (ArgumentException ex)
        {
            return Problem(ex.Message, statusCode: 404);
        }
    }

    [HttpPatch("{paradoxGuid}/status")]
    public IActionResult ChangeStatus(Guid paradoxGuid, [FromBody] UpdateParadoxStatusCmd cmd, [FromQuery] Guid? managerGuid = null)
    {
        try
        {
            _paradoxService.ChangeStatus(paradoxGuid, cmd.Status, managerGuid);
            return Ok("Paradox status updated.");
        }
        catch (ArgumentException ex)
        {
            return Problem(ex.Message, statusCode: 400);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Problem(ex.Message, statusCode: 403);
        }
    }
}
