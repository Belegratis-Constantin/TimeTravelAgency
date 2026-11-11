namespace TimeTravelAgency.Application.Service;

/// <summary>Startup configuration, bound from the "ParadoxSimulation" section of appsettings.json.</summary>
public class ParadoxSimulationOptions
{
    public const string SectionName = "ParadoxSimulation";

    public bool Enabled { get; set; } = true;
    public int IntervalSeconds { get; set; } = 120;
}
