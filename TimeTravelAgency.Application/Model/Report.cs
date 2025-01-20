using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TimeTravelAgency.Application.Model;

[Table("Reports")]
public class Report
{
    // Constructors

    public Report(string header, Agent agent, Trip trip)
    {
        Guid = Guid.NewGuid();
        Header = header;
        Date = DateTime.Now;
        
        Agent = agent;
        AgentId = agent.Id;
        Trip = trip;
        TripId = trip.Id;
    }
    
#pragma warning disable CS8618
    protected Report() { }
#pragma warning disable CS8618
    
    // Properties
    
    [Key]
    public int Id { get; set; }
    public Guid Guid { get; set; }
    public string Header { get; set; }

    public string? Content { get; set; }
    public DateTime Date { get; set; }
    
    public Agent Agent { get; set; }
    public int AgentId { get; set; }
    
    public int TripId { get; set; }
    public Trip Trip { get; set; }
    
    
    // Public Methods

    public DateTime GetDateOfTrip()
    {
        return Trip.DateInRealLife;
    }
}