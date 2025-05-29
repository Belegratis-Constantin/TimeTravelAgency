using TimeTravelAgency.Application.Dto;

namespace TimeTravelAgency.Application.Cmd;

public class CreateTripByManagerCmd
{
    public DateTime DateInRealLife { get; set; }
    public string? TripName { get; set; }
    public Guid LicensedAgentGuid { get; set; }
}
