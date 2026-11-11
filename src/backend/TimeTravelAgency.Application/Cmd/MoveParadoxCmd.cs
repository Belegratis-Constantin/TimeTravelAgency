using System.ComponentModel.DataAnnotations;

namespace TimeTravelAgency.Application.Cmd;

/// <summary>Moves a paradox within its trip's queue; position 0 makes it the paradox that is worked on now.</summary>
public class MoveParadoxCmd
{
    [Range(0, 1000)]
    public int Position { get; set; }
}
