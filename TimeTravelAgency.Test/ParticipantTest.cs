using System;
using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using TimeTravelAgency.Application.Model;
using Xunit;

namespace TimeTravelAgency.Test;

public class ParticipantTests
{
    [Fact]
    public void Participant_ShouldSetFirstnameAndLastname()
    {
        // Arrange
        var firstname = "John";
        var lastname = "Doe";
        var email = "john.doe@gmail.com";
        var phoneNumber = "+1234567890";
        var dateOfBirth = DateTime.Now.AddYears(-20);

        // Act
        var customer = new Customer(firstname, lastname, email, phoneNumber, dateOfBirth, new Address("Street", 1010, "City"));

        // Assert
        Assert.Equal(firstname, customer.Firstname);
        Assert.Equal(lastname, customer.Lastname);
        Assert.Equal(email, customer.Email);
        Assert.Equal(phoneNumber, customer.PhoneNumber);
        Assert.Equal(dateOfBirth.Date, customer.DateOfBirth);
    }

    [Fact]
    public void Participant_ShouldThrowException_WhenFirstnameIsEmpty()
    {
        // Arrange
        var lastname = "Doe";
        var email = "john.doe@gmail.com";
        var phonenumber = "+1234567890";
        var dateOfBirth = DateTime.Now.AddYears(-20);

        // Act & Assert
        Assert.Throws<ArgumentException>(() => new Customer("", lastname, email, phonenumber, dateOfBirth, new Address("Street", 1010, "City")));
    }

    [Fact]
    public void Participant_ShouldThrowException_WhenLastnameIsEmpty()
    {
        // Arrange
        var firstname = "John";
        var email = "john.doe@gmail.com";
        var phonenumber = "+1234567890";
        var dateOfBirth = DateTime.Now.AddYears(-20);

        // Act & Assert
        Assert.Throws<ArgumentException>(() => new Customer(firstname, "", email, phonenumber, dateOfBirth, new Address("Street", 1010, "City")));
    }

    [Fact]
    public void Participant_ShouldThrowException_WhenUnder18()
    {
        const string firstname = "John";
        const string lastname = "Doe";
        const string email = "john.doe@gmail.com";
        const string phoneNumber = "+1234567890";
        var dateOfBirth = DateTime.Now.AddYears(-17); // Under 18
        
        Assert.Throws<ArgumentException>(() => new Customer(firstname, lastname, email, phoneNumber, dateOfBirth, new Address("Street", 1010, "City")));
    }
    
    [Fact]
    public void Participant_ShouldThrowException_WhenEmailIsInvalid_1()
    {
        const string firstname = "John";
        const string lastname = "Doe";
        const string email = "user@com";
        const string phoneNumber = "+123456789";
        var dateOfBirth = DateTime.Now.AddYears(-20);
        
        Assert.Throws<ArgumentException>(() => new Customer(firstname, lastname, email, phoneNumber, dateOfBirth, new Address("Street", 1010, "City")));
    }
    
    [Fact]
    public void Participant_ShouldThrowException_WhenEmailIsInvalid_2()
    {
        const string firstname = "John";
        const string lastname = "Doe";
        const string email = "@example.com";
        const string phoneNumber = "+123456789";
        var dateOfBirth = DateTime.Now.AddYears(-20);
        
        Assert.Throws<ArgumentException>(() => new Customer(firstname, lastname, email, phoneNumber, dateOfBirth, new Address("Street", 1010, "City")));
    }
    
    [Fact]
    public void Participant_ShouldThrowException_WhenEmailIsInvalid_3()
    {
        const string firstname = "John";
        const string lastname = "Doe";
        const string email = "user@.com";
        const string phoneNumber = "+123456789";
        var dateOfBirth = DateTime.Now.AddYears(-20);
        
        Assert.Throws<ArgumentException>(() => new Customer(firstname, lastname, email, phoneNumber, dateOfBirth, new Address("Street", 1010, "City")));
    }

    [Fact]
    public void AddTrip_ShouldAddTripToParticipant()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        var participant = new Customer("John", "Doe", "john@doe.com", "+1234567890", DateTime.Now.AddYears(-20), new Address("Street", 1010, "City"));
        
        participant.AddTrip(trip);
        
        Assert.Single(participant.Trips);
        Assert.Contains(trip, participant.Trips);
    }

    [Fact]
    public void RemoveTrip_ShouldRemoveTripFromParticipant()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licencedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var trip = manager.CreateTrip(DateTime.Now.AddDays(15), licencedAgent);
        var participant = new Customer("John", "Doe", "john@doe.com", "+1234567890", DateTime.Now.AddYears(-20), new Address("Street", 1010, "City"));
        
        participant.AddTrip(trip);
        
        var result = participant.RemoveTrip(trip);
        
        Assert.True(result);
        Assert.Empty(participant.Trips);
    }

    [Fact]
    public void AddTrip_ShouldThrowException_WhenTripsOverlap()
    {
        var manager = new Manager("Karl", "Mayer", "karl@mayer.com", "+1234567890", new Address("Street", 1010, "City"));
        var licensedAgent1 = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var licensedAgent2 = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var participant = new Customer("John", "Doe", "john@doe.com", "+1234567890", DateTime.Now.AddYears(-20), new Address("Street", 1010, "City"));

        var trip1 = manager.CreateTrip(DateTime.Now.AddDays(10), licensedAgent1);
        var trip2 = manager.CreateTrip(DateTime.Now.AddDays(10), licensedAgent2);
        
        participant.AddTrip(trip1);
        
        var exception = Assert.Throws<InvalidOperationException>(() => participant.AddTrip(trip2));
        Assert.Equal("Participant cannot join overlapping trips.", exception.Message);
    }



    [Fact]
    public void AddTrip_ShouldAllowNonOverlappingTrips()
    {
        var manager = new Manager("Heinz", "Herzog", "heinz@herzog.com", "+1234567890", new Address("Street", 1010, "City"));
        var licensedAgent = new LicensedAgent("Karl", "Mayer", DateTime.Now.AddYears(-20), 2025, 7, DateTime.Now.AddDays(5), new Address("Street", 1010, "City"));
        var participant = new Customer("John", "Doe", "john@doe.com", "+1234567890", DateTime.Now.AddYears(-20), new Address("Street", 1010, "City"));
        var trip1 = manager.CreateTrip(DateTime.Now.AddDays(10), licensedAgent);
        var trip2 = manager.CreateTrip(DateTime.Now.AddDays(15), licensedAgent);

        participant.AddTrip(trip1);
        participant.AddTrip(trip2);
        
        Assert.Equal(2, participant.Trips.Count);
        Assert.Contains(trip1, participant.Trips);
        Assert.Contains(trip2, participant.Trips);
    }
}
