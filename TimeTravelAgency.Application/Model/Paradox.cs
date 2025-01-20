using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore.Metadata;

namespace TimeTravelAgency.Application.Model;

[Table("Paradoxes")]
public class Paradox
{
    private string _paradoxDescription;
    
    // Constructors

    public Paradox(Trip trip)
    {
        Guid = Guid.NewGuid();
        ParadoxStatus = ParadoxStatus.InQueue;
        Random rnd = new Random();
        ParadoxType = (ParadoxType)rnd.Next(0, 3);
        
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
    public Trip Trip { get; set; }
}