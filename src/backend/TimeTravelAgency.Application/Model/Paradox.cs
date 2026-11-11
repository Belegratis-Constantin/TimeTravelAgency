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

    /// <summary>
    /// Place in the trip's paradox queue (0 = the paradox that is currently being worked on).
    /// Only meaningful while the paradox is open; maintained by <see cref="Trip.RebalanceParadoxQueue"/>.
    /// </summary>
    public int QueuePosition { get; internal set; }

    /// <summary>
    /// Set once the paradox has been escalated: from then on it can only be solved with a dual lock —
    /// the trip's licensed agent and its support agent each have to win a stabilisation round.
    /// </summary>
    public bool DualLockRequired { get; private set; }
    /// <summary>When the licensed agent's lock was achieved in the current dual-lock attempt (UTC).</summary>
    public DateTime? LicensedLockAt { get; private set; }
    /// <summary>When the support agent's lock was achieved in the current dual-lock attempt (UTC).</summary>
    public DateTime? SupportLockAt { get; private set; }

    public bool HasLock(DualLockRole role) =>
        (role == DualLockRole.Licensed ? LicensedLockAt : SupportLockAt).HasValue;

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
        if (status == ParadoxStatus.Escalated) DualLockRequired = true;
        // A new attempt starts from scratch whenever the paradox falls back to the queue or is escalated.
        if (status is ParadoxStatus.Escalated or ParadoxStatus.InQueue) BreakLocks();
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

    /// <summary>
    /// Records a won dual-lock round for one role. Returns true when both locks hold — the paradox is then solved.
    /// </summary>
    /// <exception cref="InvalidOperationException">Not in dual-lock mode, not in process, or this role already locked.</exception>
    internal bool RegisterLock(DualLockRole role, Agent agent)
    {
        if (!DualLockRequired) throw new InvalidOperationException("This paradox does not need a dual lock.");
        if (ParadoxStatus != ParadoxStatus.InProcess)
            throw new InvalidOperationException("A paradox can only be stabilised while it is in process — engage it first.");
        if (HasLock(role))
            throw new InvalidOperationException("Your lock already holds — waiting for your partner.");

        if (role == DualLockRole.Licensed) LicensedLockAt = DateTime.UtcNow;
        else SupportLockAt = DateTime.UtcNow;

        if (!LicensedLockAt.HasValue || !SupportLockAt.HasValue) return false;
        SetStatus(ParadoxStatus.Solved, agent);
        return true;
    }

    /// <summary>Both locks are lost — licensed and support agent have to repeat their rounds.</summary>
    internal void BreakLocks()
    {
        LicensedLockAt = null;
        SupportLockAt = null;
    }

    private static ParadoxType RandomType()
    {
        var values = Enum.GetValues<ParadoxType>();
        return values[Random.Shared.Next(values.Length)];
    }
}