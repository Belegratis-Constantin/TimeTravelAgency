using TimeTravelAgency.Application.Dto;

namespace TimeTravelAgency.Application.Cmd;

public class CreateTripByManagerCmd
{
    public DateTime DateInRealLife { get; set; }
    public string? TripName { get; set; }
    public Guid LicensedAgentGuid { get; set; }
    /// <summary>Real-life length of the trip in minutes.</summary>
    [System.ComponentModel.DataAnnotations.Range(Model.Trip.MinDurationMinutes, Model.Trip.MaxDurationMinutes)]
    public int DurationMinutes { get; set; } = Model.Trip.DefaultDurationMinutes;
}
