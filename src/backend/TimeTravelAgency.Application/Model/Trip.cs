using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.VisualBasic;

namespace TimeTravelAgency.Application.Model;

public class Trip
{
    private Collection<Customer> _customers; 
    private Collection<Paradox> _paradoxes;
    private Collection<Report> _reports;
    private Collection<Review> _reviews;
    
    // Constructors
    public const int DefaultDurationMinutes = 240;
    public const int MinDurationMinutes = 15;
    public const int MaxDurationMinutes = 60 * 24 * 30;

    public Trip(DateTime dateInRealLife, LicensedAgent licensedAgent, Manager manager, string? tripName = null, Agent? agent = null,
        int durationMinutes = DefaultDurationMinutes)
    {
        if (durationMinutes < MinDurationMinutes || durationMinutes > MaxDurationMinutes)
            throw new ArgumentOutOfRangeException(nameof(durationMinutes),
                $"A trip lasts between {MinDurationMinutes} minutes and {MaxDurationMinutes / 60 / 24} days.");

        Guid = Guid.NewGuid();
        // All lifecycle checks run against UTC; local timestamps are normalised, unspecified ones are taken as UTC.
        DateInRealLife = dateInRealLife.Kind == DateTimeKind.Local
            ? dateInRealLife.ToUniversalTime()
            : DateTime.SpecifyKind(dateInRealLife, DateTimeKind.Utc);
        DurationMinutes = durationMinutes;
        TripName = tripName;
        
        LicensedAgent = licensedAgent;
        Manager = manager;
        TripStatus = StatusAt(DateTime.UtcNow);
        Agent = agent;
        
        _customers = new Collection<Customer>();
        _paradoxes = new Collection<Paradox>();
        _reports = new Collection<Report>();
        _reviews = new Collection<Review>();
        
        licensedAgent.AddTrip(this);
    }

#pragma warning disable CS8618
    protected Trip() { }
#pragma warning restore CS8618

    // Properties
    [Key]
    public int Id { get; private set; }
    public Guid Guid { get; init; }
    public string TripType { get; set; }
    /// <summary>Departure in real life (UTC).</summary>
    public DateTime DateInRealLife { get; private set; }
    /// <summary>How long the travellers are away (real-life minutes).</summary>
    public int DurationMinutes { get; private set; } = DefaultDurationMinutes;
    /// <summary>Return in real life (UTC) = departure + duration.</summary>
    public DateTime ReturnInRealLife => DateInRealLife.AddMinutes(DurationMinutes);
    [MaxLength(255)]
    public string? TripName { get; private set; }
    public TripStatus TripStatus { get; internal set; }
    
    public int LicensedAgentId { get; private set; }
    public virtual LicensedAgent LicensedAgent { get; private set; }

    public int? AgentId { get; private set; }
    public virtual Agent? Agent { get; private set; }
    
    public int ManagerId { get; private set; }
    public virtual Manager Manager { get; private set; }
    
    public virtual IReadOnlyCollection<Paradox> Paradoxes => _paradoxes;
    public virtual IReadOnlyCollection<Customer> Customers => _customers;
    public virtual IReadOnlyCollection<Report> Reports => _reports;
    public virtual IReadOnlyCollection<Review> Reviews => _reviews;
    
    /// <summary>Scheduled or currently running — the trip still occupies its travellers and staff.</summary>
    public bool IsOpen => TripStatus is TripStatus.Scheduled or TripStatus.Active;

    // Public Methods

    /// <summary>Whether the real-life time spans of two trips intersect (start inclusive, end exclusive).</summary>
    public bool OverlapsWith(Trip other) =>
        DateInRealLife < other.ReturnInRealLife && other.DateInRealLife < ReturnInRealLife;

    /// <summary>The status this trip has at <paramref name="utcNow"/> purely from its schedule. Cancelled stays cancelled.</summary>
    public TripStatus StatusAt(DateTime utcNow)
    {
        if (TripStatus == TripStatus.Cancelled) return TripStatus.Cancelled;
        if (utcNow < DateInRealLife) return TripStatus.Scheduled;
        return utcNow < ReturnInRealLife ? TripStatus.Active : TripStatus.Completed;
    }

    /// <summary>Applies the time-driven transitions (Scheduled → Active → Completed). Returns true if the status changed.</summary>
    public bool SyncStatus(DateTime utcNow)
    {
        // A trip ended early by its manager stays completed.
        if (TripStatus == TripStatus.Completed) return false;
        var next = StatusAt(utcNow);
        if (next == TripStatus) return false;
        TripStatus = next;
        return true;
    }
    
    internal void AddCustomer(Customer customer)
    {
        _customers.Add(customer);
    }

    internal void RemoveCustomer(Customer customer)
    {
        _customers.Remove(customer);
    }

    internal void AddReview(Review review)
    {
        _reviews.Add(review);
    }

    internal void AddReport(Report report)
    {
        _reports.Add(report);
    }

    internal void AddAgent(Agent agent)
    {
        if (Agent != null)
            throw new InvalidOperationException("Agent for this trip is already set.");
        
        AgentId = agent.Id;
        Agent = agent;
    }

    internal void RemoveAgent(Agent agent)
    {
        AgentId = null;
        Agent = null;
    }

    internal void AddParadox(Paradox paradox) // Paradoxes can not be removed
    {
        _paradoxes.Add(paradox);
    }
}