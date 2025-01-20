using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations.Schema;
using System.Runtime.InteropServices.JavaScript;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic;
using TimeTravelAgency.Application.Infrastructure;

namespace TimeTravelAgency.Application.Model;

[Table("Agents")]
public class Agent : Participant
{
    private Collection<Report> _reports;
    
    // Constructor

    public Agent(string firstname, string lastname, DateTime dateOfBirth, int specialisationTime)
        : base(firstname, lastname, dateOfBirth)
    {
        SpecialisationTime = specialisationTime;
        _reports = new Collection<Report>();
    }
    
#pragma warning disable CS8618
    protected Agent() { }
#pragma warning disable CS8618
    
    
    // Properties

    public int SpecialisationTime { get; set; }
    
    public virtual IReadOnlyCollection<Report> Reports => _reports;
    

    // Foreign key to Epoch
    public int EpochId { get; private set; }
    public Epoch SpecialisationEpoch { get; private set; }

    
    // Public Methods

    public void AssignAgentToManager(Manager manager)
    {
        manager.AddAgent(this);
    }
    
    public async Task SetSpecialisationEpochAsync(TimeTravelAgencyContext context)
    {
        var year = SpecialisationTime;
        var epoch = await context.Epochs
            .FirstOrDefaultAsync(e => e.StartYear <= year && e.EndYear >= year);

        if (epoch != null)
        {
            EpochId = epoch.Id;
            SpecialisationEpoch = epoch;
        }
        else
        {
            throw new ArgumentException("Specialisation epoch has to be in the epoch table");
        }
    }

    public Report WriteReport(string header, Trip trip, string? content=null)
    {
        if (Trips.Any(t => t == trip && (t.Agent == this || t.LicensedAgent == this)))
        {
            var report = new Report(header, this, trip)
            {
                Content = content
            };
                
            _reports.Add(report);
            trip.AddReport(report);
                
            return report;
        }

        throw new ArgumentException("Agent must be assigned to this trip");
    }
}