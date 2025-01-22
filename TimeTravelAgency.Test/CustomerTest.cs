using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Test;

public class CustomerTest
{
    [Fact]
    public void Customer_AssignToTrip_Success()
    {
        var customer = new Customer("Linus", "Sch", "linus@sch.com", "1234567890", DateTime.Now.AddYears(-21), new Address("Street", 1010, "City"));
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(20), licencedAgent);
        
        customer.AssignToTrip(trip);
        
        Assert.Contains(customer, trip.Customers);
    }
    
    [Fact]
    public void Customer_AssignToTrip_Overlapping_Failure()
    {
        var customer = new Customer("Linus", "Sch", "linus@sch.com", "1234567890", DateTime.Now.AddYears(-21), new Address("Street", 1010, "City"));
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent1 = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var licencedAgent2 = new LicensedAgent("Franz", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip1 = manager.CreateTrip(DateTime.Now.AddDays(20), licencedAgent1);
        var trip2 = manager.CreateTrip(DateTime.Now.AddDays(20), licencedAgent2);
        
        customer.AssignToTrip(trip1);
        
        Assert.Contains(customer, trip1.Customers);
        
        Assert.Throws<InvalidOperationException>(() => customer.AssignToTrip(trip2));
        Assert.DoesNotContain(customer, trip2.Customers);
    }

    [Fact]
    public void Customer_CheckOutOfTrip_Success()
    {
        var customer = new Customer("Linus", "Sch", "linus@sch.com", "1234567890", DateTime.Now.AddYears(-21), new Address("Street", 1010, "City"));
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(20), licencedAgent);
        
        customer.AssignToTrip(trip);
        Assert.Contains(customer, trip.Customers);
        customer.CheckOutOfTrip(trip);
        
        Assert.DoesNotContain(customer, trip.Customers);
    }
    
    [Fact]
    public void Customer_CheckOutOfTrip_TooClose_Failure()
    {
        var customer = new Customer("Linus", "Sch", "linus@sch.com", "1234567890", DateTime.Now.AddYears(-21), new Address("Street", 1010, "City"));
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddMinutes(30), licencedAgent);
        
        customer.AssignToTrip(trip);
        Assert.Contains(customer, trip.Customers);
        
        Assert.Throws<InvalidOperationException>(() => customer.CheckOutOfTrip(trip));
        Assert.Contains(customer, trip.Customers);
    }
    
    [Fact]
    public async Task Customer_CheckOutOfTrip_PastTrip_Failure()
    {
        var customer = new Customer("Linus", "Sch", "linus@sch.com", "1234567890", DateTime.Now.AddYears(-21), new Address("Street", 1010, "City"));
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddSeconds(3), licencedAgent);
        
        customer.AssignToTrip(trip);
        Assert.Contains(customer, trip.Customers);
        
        await Task.Delay(5000);
        
        Assert.Throws<InvalidOperationException>(() => customer.CheckOutOfTrip(trip));
        Assert.Contains(customer, trip.Customers);
    }
    
    [Fact]
    public void Customer_GetOwnUpcomingTrip_BothInFuture_Success()
    {
        var customer = new Customer("Linus", "Sch", "linus@sch.com", "1234567890", DateTime.Now.AddYears(-21), new Address("Street", 1010, "City"));
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent1 = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var licencedAgent2 = new LicensedAgent("Franz", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip1 = manager.CreateTrip(DateTime.Now.AddDays(20), licencedAgent1);
        var trip2 = manager.CreateTrip(DateTime.Now.AddDays(21), licencedAgent2);
        
        customer.AssignToTrip(trip1);
        customer.AssignToTrip(trip2);
        
        Assert.Contains(trip1, customer.GetOwnUpcomingTrips());
        Assert.Contains(trip2, customer.GetOwnUpcomingTrips());
    }
    
    [Fact]
    public async Task Customer_GetOwnUpcomingTrip_OneInFuture_Success()
    {
        var customer = new Customer("Linus", "Sch", "linus@sch.com", "1234567890", DateTime.Now.AddYears(-21), new Address("Street", 1010, "City"));
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent1 = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var licencedAgent2 = new LicensedAgent("Franz", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip1 = manager.CreateTrip(DateTime.Now.AddSeconds(3), licencedAgent1);
        var trip2 = manager.CreateTrip(DateTime.Now.AddDays(21), licencedAgent2);
        
        customer.AssignToTrip(trip1);
        customer.AssignToTrip(trip2);
        
        await Task.Delay(5000);
        
        Assert.DoesNotContain(trip1, customer.GetOwnUpcomingTrips());
        Assert.Contains(trip2, customer.GetOwnUpcomingTrips());
    }

    [Fact]
    public async Task Customer_WriteReview_Success()
    {
        var customer = new Customer("Linus", "Sch", "linus@sch.com", "1234567890", DateTime.Now.AddYears(-21), new Address("Street", 1010, "City"));
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent1 = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddSeconds(3), licencedAgent1);

        customer.AssignToTrip(trip);
        
        await Task.Delay(5000);
        
        manager.CompleteTrip(trip);
        
        var review = customer.WriteReview("Review", 4, trip);
        
        Assert.IsType<Review>(review);
        Assert.Contains(review, customer.Reviews);
        Assert.Contains(review, trip.Reviews);
    }
    
    [Fact]
    public async Task Customer_WriteReview_CanceledTrip_Failure()
    {
        var customer = new Customer("Linus", "Sch", "linus@sch.com", "1234567890", DateTime.Now.AddYears(-21), new Address("Street", 1010, "City"));
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent1 = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddSeconds(3), licencedAgent1);

        customer.AssignToTrip(trip);
        licencedAgent1.CancelTrip(trip);
        
        await Task.Delay(5000);
        
        var review = customer.WriteReview("Review", 4, trip);
        
        Assert.Equal(TripStatus.Cancelled, trip.TripStatus);
        Assert.Null(review);
    }
    
    [Fact]
    public void Customer_WriteReview_ActiveTrip_Failure()
    {
        var customer = new Customer("Linus", "Sch", "linus@sch.com", "1234567890", DateTime.Now.AddYears(-21), new Address("Street", 1010, "City"));
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent1 = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(5), licencedAgent1);

        customer.AssignToTrip(trip);
        
        var review = customer.WriteReview("Review", 4, trip);
        
        Assert.Equal(TripStatus.Active, trip.TripStatus);
        Assert.Null(review);
    }
}