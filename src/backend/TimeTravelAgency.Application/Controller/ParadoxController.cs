using Microsoft.AspNetCore.Mvc;
using TimeTravelAgency.Application.Cmd;
using TimeTravelAgency.Application.Dto;
using TimeTravelAgency.Application.Service;

namespace TimeTravelAgency.Application.Controller;

[ApiController]
[Route("api/[controller]")]
public class ParadoxController : ControllerBase
{
    private readonly ParadoxService _paradoxService;
    private readonly ParadoxSimulationState _simulation;

    public ParadoxController(ParadoxService paradoxService, ParadoxSimulationState simulation)
    {
        _paradoxService = paradoxService;
        _simulation = simulation;
    }

    /// <summary>All paradoxes, newest first, with the context of the trip they belong to.</summary>
    [HttpGet]
    public ActionResult<List<ParadoxFeedDto>> GetAll() => Ok(_paradoxService.GetFeed());

    [HttpPost("trip/{tripGuid}")]
    public ActionResult<SpawnParadoxResultDto> AddParadox(Guid tripGuid)
    {
        try
        {
            var result = _paradoxService.AddParadoxToTrip(tripGuid);
            _simulation.RecordSpawn();
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return Problem(ex.Message, statusCode: 404);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(ex.Message, statusCode: 409);
        }
    }

    /// <summary>An agent on the trip starts stabilising the paradox (→ InProcess).</summary>
    [HttpPost("{paradoxGuid}/engage/{agentGuid}")]
    public ActionResult<ParadoxFeedDto> Engage(Guid paradoxGuid, Guid agentGuid) =>
        AgentAction(() => _paradoxService.Engage(paradoxGuid, agentGuid));

    /// <summary>The agent won the stabilisation — the paradox is solved.</summary>
    [HttpPost("{paradoxGuid}/resolve/{agentGuid}")]
    public ActionResult<ParadoxFeedDto> Resolve(Guid paradoxGuid, Guid agentGuid) =>
        AgentAction(() => _paradoxService.Resolve(paradoxGuid, agentGuid));

    /// <summary>The stabilisation failed — the paradox is escalated to the manager (and can be retried).</summary>
    [HttpPost("{paradoxGuid}/fail/{agentGuid}")]
    public ActionResult<ParadoxFeedDto> Fail(Guid paradoxGuid, Guid agentGuid) =>
        AgentAction(() => _paradoxService.Fail(paradoxGuid, agentGuid));

    private ActionResult<ParadoxFeedDto> AgentAction(Func<ParadoxFeedDto> action)
    {
        try
        {
            return Ok(action());
        }
        catch (ArgumentException ex)
        {
            return Problem(ex.Message, statusCode: 404);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Problem(ex.Message, statusCode: 403);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(ex.Message, statusCode: 409);
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
