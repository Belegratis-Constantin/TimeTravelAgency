namespace TimeTravelAgency.Application.Cmd;

public class CreateCriticalTripCmd
{
    public DateTime DateInRealLife { get; set; }
    public int LicensedSupportAgentId { get; set; }
    public int LicensedAgentId { get; set; }
    public int ManagerId { get; set; }
    public string? TripName { get; set; }
}