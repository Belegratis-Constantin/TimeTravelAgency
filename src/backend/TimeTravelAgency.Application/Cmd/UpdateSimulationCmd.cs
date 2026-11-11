using System.ComponentModel.DataAnnotations;
using TimeTravelAgency.Application.Service;

namespace TimeTravelAgency.Application.Cmd;

public class UpdateSimulationCmd
{
    public bool? Enabled { get; set; }

    [Range(ParadoxSimulationState.MinIntervalSeconds, ParadoxSimulationState.MaxIntervalSeconds)]
    public int? IntervalSeconds { get; set; }
}
