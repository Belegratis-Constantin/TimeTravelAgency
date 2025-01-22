using System;
using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TimeTravelAgency.Application.Model;

public abstract class Participant
{
    private string _firstname;
    private string _lastname;
    private DateTime _dateOfBirth;
    private Collection<Trip> _trips;
    
    // Constructors

    protected Participant(string firstname, string lastname, DateTime dateOfBirth, Address address)
    {
        Guid = Guid.NewGuid();
        Firstname = firstname;
        Lastname = lastname;
        DateOfBirth = dateOfBirth.Date;
        Address = address ?? throw new ArgumentNullException(nameof(address));
        _trips = new Collection<Trip>();
    }
        
#pragma warning disable CS8618
    protected Participant() { }
#pragma warning disable CS8618
        
    
    // Properties 
    
    [Key]
    public int Id { get; set; }
    public Guid Guid { get; set; }
    
    [MaxLength(255)]
    public string Firstname
    {
        get => _firstname;
        set
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException("Firstname cannot be empty");
            _firstname = value.Trim();
        }
    }
    
    [MaxLength(255)]
    public string Lastname
    {
        get => _lastname;
        set
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException("Lastname cannot be empty");
            _lastname = value.Trim();
        }
    }
    
    [MaxLength(255)]
    public DateTime DateOfBirth
    {
        get => _dateOfBirth;
        set
        {
            if (value > DateTime.Now.AddYears(-18))
                throw new ArgumentException("Participants have to be at least 18 years old");
            _dateOfBirth = value;
        }
    }
    
    public virtual Address Address { get; set; }
    
    public virtual IReadOnlyCollection<Trip> Trips => _trips;
    
    
    //Public methods

    public void AddTrip(Trip trip)
    {
        ValidateTrip(trip);
        _trips.Add(trip);

        switch (this)
        {
            case LicensedAgent:
                return;
            case Agent agent:
                trip.AddAgent(agent);
                break;
        }
    }

    public bool RemoveTrip(Trip trip)
    {
        return _trips.Remove(trip);
    }
        
        
    // Private methods

    private void ValidateTrip(Trip trip)
    {
        if (_trips.Where(t => t.DateInRealLife > DateTime.Now &&
                              t.TripStatus == TripStatus.Active).Any(existingTrip => TripsOverlap(existingTrip, trip)))
        {
            throw new InvalidOperationException("Participant cannot join overlapping trips.");
        }
    }

    private static bool TripsOverlap(Trip existingTrip, Trip newTrip)
    {
        var existingStart = existingTrip.DateInRealLife;
        var newStart = newTrip.DateInRealLife;
        
        return newStart < existingStart.Add(TimeSpan.FromHours(1)) 
               && newStart > existingStart.Subtract(TimeSpan.FromHours(1));

    }
}