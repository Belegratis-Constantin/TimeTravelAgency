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

    /// <summary>Bookings can be cancelled free of charge until this long before departure.</summary>
    public static readonly TimeSpan CancellationCutoff = TimeSpan.FromHours(1);

    // Public Methods
    public List<Trip> GetOwnUpcomingTrips()
    {
        var now = DateTime.UtcNow;
        return Trips.Where(t => t.DateInRealLife > now && t.TripStatus == TripStatus.Scheduled).ToList();
    }

    /// <summary>The trip this customer is travelling on right now, if any (there can be at most one).</summary>
    public Trip? GetCurrentTrip(DateTime? utcNow = null)
    {
        var now = utcNow ?? DateTime.UtcNow;
        return Trips.FirstOrDefault(t => t.StatusAt(now) == TripStatus.Active);
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

    /// <summary>
    /// Books this customer on a trip. Only scheduled trips that have not departed yet can be booked, and a
    /// traveller can never be on two trips at once: the real-life time span must not overlap another open booking.
    /// </summary>
    public void AssignToTrip(Trip trip, DateTime? utcNow = null)
    {
        var now = utcNow ?? DateTime.UtcNow;

        if (Trips.Contains(trip) || trip.Customers.Contains(this))
            throw new InvalidOperationException("You are already booked on this trip.");

        switch (trip.StatusAt(now))
        {
            case TripStatus.Cancelled:
                throw new InvalidOperationException("This trip has been cancelled and cannot be booked.");
            case TripStatus.Active:
                throw new InvalidOperationException("This trip has already departed and is under way.");
            case TripStatus.Completed:
                throw new InvalidOperationException("This trip is already over.");
        }

        var conflict = Trips.FirstOrDefault(t => t.StatusAt(now) is TripStatus.Scheduled or TripStatus.Active && t.OverlapsWith(trip));
        if (conflict != null)
        {
            throw new InvalidOperationException(
                $"You are already travelling on \"{conflict.TripName ?? "another trip"}\" during this time.");
        }

        AddTrip(trip);
        trip.AddCustomer(this);
    }
    
    /// <summary>Cancels a booking. Allowed until <see cref="CancellationCutoff"/> before departure.</summary>
    public void CheckOutOfTrip(Trip trip, DateTime? utcNow = null)
    {
        var now = utcNow ?? DateTime.UtcNow;

        if (!Trips.Contains(trip) && !trip.Customers.Contains(this))
            throw new InvalidOperationException("You are not booked on this trip.");

        if (trip.StatusAt(now) != TripStatus.Scheduled || trip.DateInRealLife - now < CancellationCutoff)
        {
            throw new InvalidOperationException("Bookings can only be cancelled until one hour before departure.");
        }

        trip.RemoveCustomer(this);
        RemoveTrip(trip);
    }
}
