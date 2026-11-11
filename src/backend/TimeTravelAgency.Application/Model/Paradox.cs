using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore.Metadata;

namespace TimeTravelAgency.Application.Model;

[Table("Paradoxes")]
public class Paradox
{
    private string _paradoxDescription;
    
    // Constructors

    public Paradox(Trip trip, ParadoxType? paradoxType = null)
    {
        Guid = Guid.NewGuid();
        ParadoxStatus = ParadoxStatus.InQueue;
        ParadoxType = paradoxType ?? RandomType();
        CreatedAt = DateTime.UtcNow;
        
        Trip = trip;
        TripId = trip.Id;
        
        trip.AddParadox(this);
    }
    
#pragma warning disable CS8618
    protected Paradox() { }
#pragma warning disable CS8618
    
    
    // Properties
    
    [Key]
    public int Id { get; set; }
    public Guid Guid { get; set; }
    public ParadoxStatus ParadoxStatus { get; set; }
    public ParadoxType ParadoxType { get; set; }
    public DateTime CreatedAt { get; private set; }
    /// <summary>When the paradox was stabilised (UTC); null while it is still open.</summary>
    public DateTime? ResolvedAt { get; private set; }
    /// <summary>The agent who stabilised it in the field, if it was solved by an agent.</summary>
    public int? ResolvedByAgentId { get; private set; }

    public bool IsOpen => ParadoxStatus != ParadoxStatus.Solved;

    [MaxLength(255)]
    public string ParadoxDescription
    {
        get
        {
            return ParadoxType switch
            {
                ParadoxType.GrandFatherParadox =>
                    "A time travel paradox where altering past events prevents one's own existence.",
                ParadoxType.BootstrapParadox =>
                    "A scenario where an object or information is sent back in time, becoming the cause of its own existence.",
                ParadoxType.PredestinationParadox =>
                    "A paradox where actions taken by time travelers in the past are part of a pre-determined future, creating an inescapable loop of events.",
                ParadoxType.InformationParadox =>
                    "A paradox where future information is sent to the past, creating logical inconsistencies.",
                _ => "No known description found."
            };
        }
    }
    
    public int TripId { get; set; }
    public virtual Trip Trip { get; set; }

    /// <summary>Moves the paradox to a new status; marks resolution time and agent when it becomes solved.</summary>
    internal void SetStatus(ParadoxStatus status, Agent? resolvedBy = null)
    {
        ParadoxStatus = status;
        if (status == ParadoxStatus.Solved)
        {
            ResolvedAt = DateTime.UtcNow;
            ResolvedByAgentId = resolvedBy?.Id;
        }
        else
        {
            ResolvedAt = null;
            ResolvedByAgentId = null;
        }
    }

    private static ParadoxType RandomType()
    {
        var values = Enum.GetValues<ParadoxType>();
        return values[Random.Shared.Next(values.Length)];
    }
}