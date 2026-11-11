using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using TimeTravelAgency.Application.Infrastructure;

namespace TimeTravelAgency.Application.Model;

[Table("Managers")]
public class Manager
{
    private string _email;
    private List<Trip> _trips = [];
    private List<Agent> _agents = [];
    
    // Constructors
    
    public Manager(string firstName, string lastName, string email, string phoneNumber, Address address)
    {
        Guid = Guid.NewGuid();
        Firstname = firstName;
        Lastname = lastName;
        Email = email;
        PhoneNumber = phoneNumber;
        Address = address ?? throw new ArgumentNullException(nameof(address));
    }
        
#pragma warning disable CS8618
    protected Manager() {}
#pragma warning disable CS8618
    
    
    // Properties
    
    [Key]
    public int Id { get; init; }
    public Guid Guid { get; init; }
    [MaxLength(255)]
    public string Firstname { get; set; }
    [MaxLength(255)]
    public string Lastname { get; set; }
    [MaxLength(255)]
    public string Email
    {
        get => _email;
        set
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException("Email cannot be null or empty.", nameof(value));
            
            var emailRegex = @"^[^@\s]+@[^@\s]+\.[^@\s]+$";
            if (!Regex.IsMatch(value, emailRegex))
                throw new ArgumentException("Invalid email format.", nameof(value));

            _email = value;
        }
    }
    public string PhoneNumber { get; set; }
    
    public virtual Address Address { get; set; }
    
    public virtual IReadOnlyCollection<Trip> Trips => _trips;
    public virtual IReadOnlyCollection<Agent> Agents => _agents;

    public int? DirectorId { get; set; }
    public virtual Director? Director { get; set; }

    public void AssignToDirector(Director director)
    {
        Director = director;
        DirectorId = director.Id;
    }
    private const int MaxAmountManagedTrips = 5;
    
    
    // Public Methods

    public void AddAgent(Agent agent)
    {
        _agents.Add(agent);
    }

    public void AddAgentToTrip(Agent agent, Trip trip)
    {
        if (_agents.Contains(agent))
            trip.AddAgent(agent);
        else
            throw new ArgumentException("Agent is not managed by this manager.", nameof(agent));
    }
    
    public void RemoveAgentFromTrip(Agent agent, Trip trip)
    {
        if (_agents.Contains(agent))
            trip.RemoveAgent(agent);
    }
    
    public Trip CreateTrip(DateTime dateInRealLife, LicensedAgent licensedAgent, string? tripName = null,
        int durationMinutes = Trip.DefaultDurationMinutes)
    {
        if (_trips.Count(t => t.IsOpen) >= MaxAmountManagedTrips) 
            throw new InvalidOperationException($"Cannot manage more than {MaxAmountManagedTrips} open trips.");

        var trip = new Trip(dateInRealLife, licensedAgent, this, tripName, durationMinutes: durationMinutes);

        _trips.Add(trip);

        return trip;
    }

    /// <summary>Ends a trip that has already departed (early return). Scheduled or cancelled trips are left untouched.</summary>
    public void CompleteTrip(Trip trip)
    {
        if (trip.TripStatus != TripStatus.Cancelled && trip.DateInRealLife <= DateTime.UtcNow)
            trip.TripStatus = TripStatus.Completed;
    }

    public LicensedAgent MakeAgentLicensed(Agent agent, int licenseNumber, DateTime licenseExpirationDate)
    {
        if (!_agents.Contains(agent))
        {
            throw new InvalidOperationException($"Agent {agent.Lastname} is not managed by manager {this.Firstname} {this.Lastname}.");
        }
        
        if(agent is LicensedAgent licensedAgent)
        {
            licensedAgent.LicenseNumber = licenseNumber;
            licensedAgent.LicenseExpirationDate = licenseExpirationDate;
            
            return licensedAgent;
        }

        var newLicensedAgent = new LicensedAgent(
            agent.Firstname,
            agent.Lastname,
            agent.DateOfBirth,
            agent.SpecialisationTime,
            licenseNumber,
            licenseExpirationDate,
            agent.Address
        );
        
        newLicensedAgent.AssignAgentToManager(this);

        return newLicensedAgent;
    }
    
    public CriticalTrip MakeTripCritical(Trip trip, LicensedAgent licensedSupportAgent)
    {
        if (trip is CriticalTrip criticalTrip)
        {
            return criticalTrip;
        }

        var paradoxCounter = trip.Paradoxes.Count(paradox => paradox.ParadoxStatus == ParadoxStatus.InQueue || paradox.ParadoxStatus == ParadoxStatus.InProcess);

        if (trip.StatusAt(DateTime.UtcNow) != TripStatus.Active)
        {
            throw new InvalidOperationException("Only a trip that is currently under way can become critical.");
        }

        if (paradoxCounter < 2)
        {
            throw new InvalidOperationException($"Cannot make a trip critical by less than 2 paradoxes."); 
        }
    
        var newCriticalTrip = CreateCriticalTrip(trip, licensedSupportAgent, trip.TripName);

        return newCriticalTrip;
    }
    
    
    // Private Methods
    
    private CriticalTrip CreateCriticalTrip(Trip trip, LicensedAgent licensedSupportAgent, string? tripName = null)
    {
        // The critical trip replaces the original one, so the licensed agent must not be double-booked.
        trip.LicensedAgent.RemoveTrip(trip);

        var criticalTrip = new CriticalTrip(
            licensedSupportAgent,
            trip.DateInRealLife,
            trip.LicensedAgent,
            this, 
            tripName,
            trip.DurationMinutes
        );

        _trips.Remove(trip);
        _trips.Add(criticalTrip);
        
        AddAgentToTrip(licensedSupportAgent, criticalTrip);

        return criticalTrip;
    }

}