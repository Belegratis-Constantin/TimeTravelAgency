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
    private string _phoneNumber;
    private Collection<Trip> _trips;
    private Collection<Agent> _agents;
    
    // Constructors
    
    public Manager(string firstName, string lastName, string email, string phoneNumber)
    {
        Guid = Guid.NewGuid();
        Firstname = firstName;
        Lastname = lastName;
        Email = email;
        PhoneNumber = phoneNumber;
        _trips = new Collection<Trip>();
        _agents = new Collection<Agent>();
    }
        
#pragma warning disable CS8618
    protected Manager() { }
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
    public string PhoneNumber
    {
        get => _phoneNumber;
        set
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException("Phone number cannot be null or empty.", nameof(value));
            
            var phoneRegex = @"^(\+?[1-9]{1}[0-9]{1,4})?(\([0-9]{1,4}\)|[0-9]{1,4})?([0-9]{7,10})$";
            if (!Regex.IsMatch(value, phoneRegex))
                throw new ArgumentException("Invalid phone number format.", nameof(value));

            _phoneNumber = value;
        }
    }
    
    public virtual IReadOnlyCollection<Trip> Trips => _trips;
    public virtual IReadOnlyCollection<Agent> Agents => _agents;
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
    }
    
    public void RemoveAgentFromTrip(Agent agent, Trip trip)
    {
        if (_agents.Contains(agent))
            trip.RemoveAgent(agent);
    }
    
    public Trip CreateTrip(DateTime dateInRealLife, LicensedAgent licensedAgent, string? tripName = null)
    {
        if (_trips.Count(t => t.TripStatus == TripStatus.Active) >= MaxAmountManagedTrips) 
            throw new InvalidOperationException($"Cannot manage more than {MaxAmountManagedTrips} trips.");

        var trip = new Trip(dateInRealLife, licensedAgent, Id, tripName);

        _trips.Add(trip);

        return trip;
    }

    public void CompleteTrip(Trip trip)
    {
        if (trip.DateInRealLife < DateTime.Now)
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
            licenseExpirationDate
        ); 

        return newLicensedAgent;
    }
    
    public CriticalTrip MakeTripCritical(Trip trip, LicensedAgent licensedSupportAgent)
    {
        if (trip is CriticalTrip criticalTrip)
        {
            return criticalTrip;
        }

        var paradoxCounter = trip.Paradoxes.Count(paradox => paradox.ParadoxStatus == ParadoxStatus.InQueue || paradox.ParadoxStatus == ParadoxStatus.InProcess);

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
        if (_trips.Count(t => t.TripStatus == TripStatus.Active) >= MaxAmountManagedTrips) 
            throw new InvalidOperationException($"Cannot manage more than {MaxAmountManagedTrips} trips.");

        var criticalTrip = new CriticalTrip(
            licensedSupportAgent,
            trip.DateInRealLife,
            trip.LicensedAgent,
            this.Id, 
            tripName
        );

        _trips.Remove(trip);
        _trips.Add(trip);
        
        AddAgentToTrip(licensedSupportAgent, criticalTrip);

        return criticalTrip;
    }

}