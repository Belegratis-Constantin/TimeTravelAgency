using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
//using TimeTravelAgency.Application.Data;
using TimeTravelAgency.Application.Infrastructure;

namespace TimeTravelAgency.Application.Model;

[Table("Epochs")]
public class Epoch
{
    private string _name;
    private static int _idCounter;
    
    //Constructors

    public Epoch(long startYear, long endYear, string name, string description)
    {
        Id = _idCounter++;
        Guid = Guid.NewGuid();
        Name = name;
        StartYear = startYear;
        EndYear = endYear;
        Description = description;
        _historicalEvents = new Collection<HistoricalEvent>();
    }
    
#pragma warning disable CS8618
    protected Epoch() { }
#pragma warning disable CS8618
    
    
    // Properties
    [Key]
    public int Id { get; private set; }
    public Guid Guid { get; init; }
    public long StartYear { get; set; }
    public long EndYear { get; set; }
    public string Description { get; set; }

    private Collection<HistoricalEvent> _historicalEvents;
    public virtual IReadOnlyCollection<HistoricalEvent> HistoricalEvents => _historicalEvents;
    
    [MaxLength(255)]
    public string Name
    {
        get => _name;
        init
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException("Epoch name cannot be null or whitespace.", nameof(value));
            
            _name = value;
        }
    }
    
    
    // Public Methods

    public void AddHistoricalEvent(HistoricalEvent historicalEvent)
    {
        _historicalEvents.Add(historicalEvent);
    }

    public void RemoveHistoricalEvent(HistoricalEvent historicalEvent)
    {
        _historicalEvents.Remove(historicalEvent);
    }
    
    public async Task AddMatchingHistoricalEventsAsync(TimeTravelAgencyContext context)
    {
        var matchingEvents = await context.HistoricalEvents
            .Where(h => h.EventYear >= StartYear && h.EventYear <= EndYear)
            .ToListAsync();

        foreach (var historicalEvent in matchingEvents)
        {
            if (!_historicalEvents.Contains(historicalEvent))
            {
                _historicalEvents.Add(historicalEvent);
            }
        }
    }
}