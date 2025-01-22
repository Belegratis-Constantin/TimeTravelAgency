using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TimeTravelAgency.Application.Model;

[Table("Reviews")]
public class Review
{
    private int _stars;
    
    // Constructors

    public Review(string header, int stars, Customer customer, Trip trip, string? content=null)
    {
        Guid = Guid.NewGuid();
        Stars = stars;
        Header = header;
        Stars = stars;
        Date = DateTime.Now;
        Content = content;
        
        Customer = customer;
        CustomerId = customer.Id;
        Trip = trip;
        TripId = trip.Id;
    }
    
#pragma warning disable CS8618
    protected Review(int stars) { }
#pragma warning disable CS8618
    
    // Properties
    
    [Key]
    public int Id { get; set; }
    public Guid Guid { get; set; }

    public int Stars
    {
        get => _stars;
        set
        {
            if (value is > 0 and <= 5)
            {
                _stars = value;
            }
            else
            {
                throw new ArgumentException("Stars must be between 0 and 5.");
            }
        }
    }
    public string Header { get; set; }

    public string? Content { get; set; }
    public DateTime Date { get; set; }
    
    public Customer Customer { get; set; }
    public int CustomerId { get; set; }
    
    public int TripId { get; set; }
    public Trip Trip { get; set; }
    
    
    // Public Methods

    public DateTime GetDateOfTrip()
    {
        return Trip.DateInRealLife;
    }
}