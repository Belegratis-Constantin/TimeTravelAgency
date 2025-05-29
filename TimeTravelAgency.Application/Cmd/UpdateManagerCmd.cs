namespace TimeTravelAgency.Application.Cmd;

public class UpdateManagerCmd
{
    public string? Firstname { get; set; }
    public string? Lastname { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public AddressDto? Address { get; set; }
}