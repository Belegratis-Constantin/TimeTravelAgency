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

    /// <summary>Open paradoxes in processing order — the first one is the paradox that is currently being worked on.</summary>
    [NotMapped]
    public IReadOnlyList<Paradox> ParadoxQueue =>
        _paradoxes.Where(p => p.IsOpen).OrderBy(p => p.QueuePosition).ThenBy(p => p.CreatedAt).ToList();

    /// <summary>The paradox whose turn it is (head of the queue), or null if every paradox is solved.</summary>
    [NotMapped]
    public Paradox? CurrentParadox => ParadoxQueue.FirstOrDefault();

    /// <summary>A new paradox is appended to the end of the queue. Paradoxes can not be removed.</summary>
    internal void AddParadox(Paradox paradox)
    {
        var queue = ParadoxQueue;
        paradox.QueuePosition = queue.Count == 0 ? 0 : queue[^1].QueuePosition + 1;
        _paradoxes.Add(paradox);
        RebalanceParadoxQueue();
    }

    /// <summary>Moves an open paradox to <paramref name="position"/> in the queue (0 = make it the current one).</summary>
    /// <exception cref="ArgumentException">The paradox does not belong to this trip.</exception>
    /// <exception cref="InvalidOperationException">The paradox is already solved.</exception>
    internal void MoveParadoxInQueue(Paradox paradox, int position)
    {
        if (!_paradoxes.Contains(paradox)) throw new ArgumentException("The paradox does not belong to this trip.");
        if (!paradox.IsOpen) throw new InvalidOperationException("A solved paradox is no longer in the queue.");

        var queue = ParadoxQueue.Where(p => p != paradox).ToList();
        queue.Insert(Math.Clamp(position, 0, queue.Count), paradox);
        for (var i = 0; i < queue.Count; i++) queue[i].QueuePosition = i;
        RebalanceParadoxQueue();
    }

    /// <summary>
    /// Keeps the queue consistent: positions are renumbered 0..n-1, the head is in process (or stays escalated,
    /// waiting for its dual lock), every other open paradox waits in the queue. A paradox that loses its turn
    /// also loses any dual-lock progress, but stays a dual-lock paradox.
    /// </summary>
    internal void RebalanceParadoxQueue()
    {
        var queue = ParadoxQueue;
        for (var i = 0; i < queue.Count; i++)
        {
            var paradox = queue[i];
            paradox.QueuePosition = i;
            if (i == 0)
            {
                if (paradox.ParadoxStatus == ParadoxStatus.InQueue) paradox.SetStatus(ParadoxStatus.InProcess);
            }
            else if (paradox.ParadoxStatus != ParadoxStatus.InQueue)
                paradox.SetStatus(ParadoxStatus.InQueue);
        }
    }
}