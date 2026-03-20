namespace TimeTravelAgency.Application.Cmd;

public class CreateTripCmd
{
    public DateTime DateInRealLife { get; set; }
    public string? TripName { get; set; }

    public int LicensedAgentId { get; set; }
    public int ManagerId { get; set; }
    public int? AgentId { get; set; }

    public List<int> ParadoxIds { get; set; } = [];
    public List<int> CustomerIds { get; set; } = [];
    public List<int> ReportIds { get; set; } = [];
    public List<int> ReviewIds { get; set; } = [];
}