using System.ComponentModel.DataAnnotations;

namespace TimeTravelAgency.Application.Cmd;

public class CreateReportCmd
{
    [Required, MaxLength(255)]
    public string Header { get; set; } = string.Empty;

    public string? Content { get; set; }
}
