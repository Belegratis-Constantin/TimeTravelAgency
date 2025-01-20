using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.VisualBasic;

namespace TimeTravelAgency.Application.Model;

public class Trip
{
    private Collection<Customer> _customers; 
    private Collection<Paradox> _paradoxes;
    private Collection<Report> _reports;
    private Collection<Review> _reviews;
    
    // Constructors
    internal Trip(DateTime dateInRealLife, LicensedAgent licensedAgent, int managerId, string? tripName = null)
    {
        Guid = Guid.NewGuid();
        DateInRealLife = dateInRealLife;
        TripName = tripName;
        
        LicensedAgentId = licensedAgent.Id;
        LicensedAgent = licensedAgent;
        ManagerId = managerId;
        TripStatus = TripStatus.Active;
        
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
    
    public DateTime DateInRealLife { get; private set; }
    [MaxLength(255)]
    public string? TripName { get; private set; }
    public TripStatus TripStatus { get; internal set; }
    
    public int LicensedAgentId { get; private set; }
    public LicensedAgent LicensedAgent { get; private set; }

    public int? AgentId { get; private set; }
    public Agent? Agent { get; private set; }
    
    public int ManagerId { get; private set; }
    public Manager Manager { get; private set; }
    
    public IReadOnlyCollection<Paradox> Paradoxes => _paradoxes;
    public IReadOnlyCollection<Customer> Customers => _customers;
    public IReadOnlyCollection<Report> Reports => _reports;
    public IReadOnlyCollection<Review> Reviews => _reviews;
    
    // Public Methods
    
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
            return;
        
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