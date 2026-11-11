using Microsoft.AspNetCore.Mvc;
using TimeTravelAgency.Application.Cmd;
using TimeTravelAgency.Application.Dto;
using TimeTravelAgency.Application.Service;

namespace TimeTravelAgency.Application.Controller;

/// <summary>Controls the runtime paradox simulation (used by the "Time Itself" role and for manual testing).</summary>
[ApiController]
[Route("api/[controller]")]
public class SimulationController : ControllerBase
{
    private readonly ParadoxSimulationState _state;
    private readonly ParadoxService _paradoxService;

    public SimulationController(ParadoxSimulationState state, ParadoxService paradoxService)
    {
        _state = state;
        _paradoxService = paradoxService;
    }

    [HttpGet]
    public ActionResult<ParadoxSimulationDto> Get() => Ok(_state.Snapshot());

    [HttpPut]
    public ActionResult<ParadoxSimulationDto> Update([FromBody] UpdateSimulationCmd cmd)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        _state.Update(cmd.Enabled, cmd.IntervalSeconds);
        return Ok(_state.Snapshot());
    }

    /// <summary>Immediately spawns a paradox on a random active trip.</summary>
    [HttpPost("spawn")]
    public ActionResult<SpawnParadoxResultDto> SpawnNow()
    {
        var result = _paradoxService.SpawnRandomParadox();
        if (result == null)
            return Problem("No active trip available for a paradox.", statusCode: 409);

        _state.RecordSpawn();
        return Ok(result);
    }
}
