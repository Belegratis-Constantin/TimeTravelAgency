using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
//using TimeTravelAgency.Application.Data;
using TimeTravelAgency.Application.Infrastructure;

namespace TimeTravelAgency.Application.Model;

[Table("HistoricalEvents")]
public class HistoricalEvent
{
    // Constructors

    public HistoricalEvent(string eventName, decimal eventYear)
    {
        Id = Guid.NewGuid();
        EventName = eventName;
        EventYear = eventYear;
    }
    
#pragma warning disable CS8618
    protected HistoricalEvent() { }
#pragma warning disable CS8618
    
    
    // Properties
    
    [Key]
    public Guid Id { get; init; }
    
    public int? EpochId { get; set; }
    public Epoch? Epoch { get; set; }

    public string EventName { get; init; }
    public decimal EventYear { get; init; }
    
    
    // Public Methods
    
    public async Task AssignEpochAsync(TimeTravelAgencyContext context, CancellationToken cancellationToken = default)
    {
        if (context == null)
        {
            throw new ArgumentNullException(nameof(context), "Context cannot be null.");
        }
        
        var matchingEpoch = await context.Epochs
            .FirstOrDefaultAsync(
                e => e != null && e.StartYear <= EventYear && e.EndYear >= EventYear,
                cancellationToken);

        if (matchingEpoch != null)
        {
            EpochId = matchingEpoch.Id;
            Epoch = matchingEpoch;
        }
        else
        {
            throw new InvalidOperationException($"No matching epoch found for the event year {EventYear}.");
        }
    }

}