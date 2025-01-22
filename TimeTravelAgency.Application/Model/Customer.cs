using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.RegularExpressions;

namespace TimeTravelAgency.Application.Model;

[Table("Customers")]
public class Customer : Participant
{
    private string _email;
    private Collection<Review> _reviews;
    private Collection<Trip> _trips;

    // Constructor
    public Customer(string firstname, string lastname, string email, string phoneNumber, DateTime dateOfBirth, Address address)
        : base(firstname, lastname, dateOfBirth, address)
    {
        Email = email;
        PhoneNumber = phoneNumber;
        
        _reviews = new Collection<Review>();
    }

#pragma warning disable CS8618
    public Customer() { }
#pragma warning restore CS8618

    // Properties
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

    [MaxLength(20)]
    public string PhoneNumber { get; set; }
    
    public virtual IReadOnlyCollection<Review> Reviews => _reviews;

    // Public Methods
    public List<Trip> GetOwnUpcomingTrips()
    {
        return Trips.Where(t => t.DateInRealLife > DateTime.Now && t.TripStatus == TripStatus.Active).ToList();
    }
    
    public Review? WriteReview(string header, int stars, Trip trip, string? content = null)
    {
        if (!Trips.Any(t => t == trip && t.Customers.Contains(this))) return null;
        
        if (trip.TripStatus != TripStatus.Completed)
            return null;
        
        var review = new Review(header, stars, this, trip)
        {
            Content = content
        };
                
        _reviews.Add(review);
        trip.AddReview(review);
        
        return review;
    }

    public void AssignToTrip(Trip trip)
    {
        if (trip.DateInRealLife < DateTime.Now || trip.TripStatus != TripStatus.Active)
        {
            throw new InvalidOperationException("Cannot assign to inactive or past trips.");
        }

        if (Trips.Any(existingTrip => existingTrip.TripStatus == TripStatus.Active &&
                                      existingTrip.DateInRealLife >= trip.DateInRealLife.AddHours(-1) &&
                                      existingTrip.DateInRealLife <= trip.DateInRealLife.AddHours(1)))
        {
            throw new InvalidOperationException("Cannot assign to overlapping trips.");
        }

        trip.AddCustomer(this);
        AddTrip(trip);
    }
    
    public void CheckOutOfTrip(Trip trip)
    {
        if (trip.DateInRealLife < DateTime.Now.AddHours(1) || trip.TripStatus != TripStatus.Active)
        {
            throw new InvalidOperationException("Cannot check out of inactive or past trips.");
        }

        trip.RemoveCustomer(this);
        RemoveTrip(trip);
    }
}
