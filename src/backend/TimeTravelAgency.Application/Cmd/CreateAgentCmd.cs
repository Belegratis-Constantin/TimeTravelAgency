namespace TimeTravelAgency.Application.Cmd;
public class CreateAgentCmd
{
    public string Firstname { get; set; } = default!;
    public string Lastname { get; set; } = default!;
    public DateTime DateOfBirth { get; set; }
    public int SpecialisationTime { get; set; } // z.B. 1890
    public string AgentType { get; set; } = default!;

    public int? ManagerId { get; set; } // optional – kann null sein

    public AddressDto Address { get; set; } = default!;
}