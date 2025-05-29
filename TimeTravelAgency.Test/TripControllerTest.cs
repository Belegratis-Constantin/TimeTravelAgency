using System.Net;
using System.Net.Http.Json;
using TimeTravelAgency.Application.Dto;
using Xunit;
using System.Collections.Generic;
using System;
using System.Linq;
using System.Threading.Tasks;
using TimeTravelAgency.Application.Cmd;

namespace TimeTravelAgency.Test;

public class TripControllerTests
{
    private const string BaseUrl = "http://localhost:5000/api/trip";

    private readonly HttpClient _client = new HttpClient();

    private async Task<List<TripDto>> GetAllTripsAsync()
    {
        var response = await _client.GetAsync(BaseUrl);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<TripDto>>() ?? new List<TripDto>();
    }

    private async Task<List<CustomerDto>> GetAllCustomersAsync()
    {
        var response = await _client.GetAsync("http://localhost:5000/api/customer");
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<CustomerDto>>() ?? new List<CustomerDto>();
    }

    [Fact]
    public async Task GetAllTrips_ReturnsOk()
    {
        var response = await _client.GetAsync(BaseUrl);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var trips = await response.Content.ReadFromJsonAsync<List<TripDto>>();
        Assert.NotNull(trips);
    }

    [Fact]
    public async Task GetTripByGuid_ReturnsOkOrNotFound()
    {
        var trips = await GetAllTripsAsync();

        if (trips.Any())
        {
            var trip = trips.First();

            var response = await _client.GetAsync($"{BaseUrl}/{trip.Guid}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var tripDto = await response.Content.ReadFromJsonAsync<TripDto>();
            Assert.NotNull(tripDto);
            Assert.Equal(trip.Guid, tripDto.Guid);
        }

        var notFoundResponse = await _client.GetAsync($"{BaseUrl}/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, notFoundResponse.StatusCode);
    }

    [Fact]
    public async Task BookTrip_ValidTripAndCustomer_ReturnsOk()
    {
        var trips = await GetAllTripsAsync();
        var customers = await GetAllCustomersAsync();
        
        var validTrip = trips.LastOrDefault(t => t.DateInRealLife > DateTime.UtcNow.AddHours(1));
        var validCustomer = customers.FirstOrDefault();
        foreach (var customer in customers)
        {
            if (validTrip != null && !validTrip.Customers.Contains(customer))
                validCustomer = customer;
        }

        Assert.NotNull(validTrip);
        Assert.NotNull(validCustomer);

        var response = await _client.PostAsync($"{BaseUrl}/{validTrip.Guid}/book/{validCustomer.guid}", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task BookTrip_InvalidTripGuid_ReturnsBadRequest()
    {
        var customers = await GetAllCustomersAsync();
        var validCustomer = customers.FirstOrDefault();
        Assert.NotNull(validCustomer);

        var invalidTripGuid = Guid.NewGuid();

        var response = await _client.PostAsync($"{BaseUrl}/{invalidTripGuid}/book/{validCustomer.guid}", null);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task BookTrip_InvalidCustomerGuid_ReturnsBadRequest()
    {
        var trips = await GetAllTripsAsync();
        var validTrip = trips.FirstOrDefault(t => t.DateInRealLife > DateTime.UtcNow.AddHours(1));
        Assert.NotNull(validTrip);

        var invalidCustomerGuid = Guid.NewGuid();

        var response = await _client.PostAsync($"{BaseUrl}/{validTrip.Guid}/book/{invalidCustomerGuid}", null);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task BookTrip_AlreadyBookedTrip_ReturnsConflict()
    {
        var trips = await GetAllTripsAsync();
        var trip = trips.FirstOrDefault(t => t.DateInRealLife > DateTime.UtcNow.AddHours(1));
        Assert.NotNull(trip);
        
        var cmd = CreateValidCustomerCmd();

        var customerUrl = "http://localhost:5000/api/customer";
        var responseClient = await _client.PostAsJsonAsync(customerUrl, cmd);
        var returnedCustomerDto = await responseClient.Content.ReadFromJsonAsync<CustomerDto>();
        if (returnedCustomerDto == null)
            Assert.Fail("Failed to create a valid customer for booking.");
        
        var responseFirstTry = await _client.PostAsync($"{BaseUrl}/{trip.Guid}/book/{returnedCustomerDto.guid}", null);
        Assert.Equal(HttpStatusCode.OK, responseFirstTry.StatusCode);
        
        var responseSecondTry = await _client.PostAsync($"{BaseUrl}/{trip.Guid}/book/{returnedCustomerDto.guid}", null);
        Assert.Equal(HttpStatusCode.Conflict, responseSecondTry.StatusCode);
    }

    [Fact]
    public async Task BookTrip_PastTrip_ReturnsConflict()
    {
        var trips = await GetAllTripsAsync();
        var customers = await GetAllCustomersAsync();

        var pastTrip = trips.FirstOrDefault(t => t.DateInRealLife < DateTime.UtcNow);
        var validCustomer = customers.FirstOrDefault();

        Assert.NotNull(pastTrip);
        Assert.NotNull(validCustomer);

        var response = await _client.PostAsync($"{BaseUrl}/{pastTrip.Guid}/book/{validCustomer.guid}", null);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }
    
    [Fact]
    public async Task GetUpcomingTrips_ReturnsOk_WithUpcomingTripsUnsorted()
    {
        var response = await _client.GetAsync($"{BaseUrl}/upcoming?sorted=false");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var trips = await response.Content.ReadFromJsonAsync<List<TripDto>>();
        Assert.NotNull(trips);

        Assert.All(trips, trip =>
            Assert.True(trip.DateInRealLife > DateTime.UtcNow, $"Trip {trip.Guid} hat ein Datum in der Vergangenheit."));
    }
    
    [Fact]
    public async Task GetUpcomingTrips_ReturnsOk_WithUpcomingTripsSorted()
    {
        var response = await _client.GetAsync($"{BaseUrl}/upcoming?sorted=true");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var trips = await response.Content.ReadFromJsonAsync<List<TripDto>>();
        Assert.NotNull(trips);

        Assert.All(trips, trip =>
            Assert.True(trip.DateInRealLife > DateTime.UtcNow, $"Trip {trip.Guid} hat ein Datum in der Vergangenheit."));
        
        for (int i = 1; i < trips.Count; i++)
        {
            Assert.True(trips[i].DateInRealLife >= trips[i - 1].DateInRealLife,
                $"Trips sind nicht sortiert: Trip {i - 1} Datum {trips[i - 1].DateInRealLife} > Trip {i} Datum {trips[i].DateInRealLife}");
        }
    }
    
    [Fact]
    public async Task GetUpcomingTrips_ReturnsOk_WithUpcomingTripsSortedDefault()
    {
        var response = await _client.GetAsync($"{BaseUrl}/upcoming");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var trips = await response.Content.ReadFromJsonAsync<List<TripDto>>();
        Assert.NotNull(trips);

        Assert.All(trips, trip =>
            Assert.True(trip.DateInRealLife > DateTime.UtcNow, $"Trip {trip.Guid} hat ein Datum in der Vergangenheit."));
        
        for (int i = 1; i < trips.Count; i++)
        {
            Assert.True(trips[i].DateInRealLife >= trips[i - 1].DateInRealLife,
                $"Trips sind nicht sortiert: Trip {i - 1} Datum {trips[i - 1].DateInRealLife} > Trip {i} Datum {trips[i].DateInRealLife}");
        }
    }
    
    private static CreateCustomerCmd CreateValidCustomerCmd() =>
        new CreateCustomerCmd
        {
            Firstname = "Anna",
            Lastname = "Musterfrau",
            Email = "anna@example.com",
            PhoneNumber = "+43123456789",
            DateOfBirth = DateTime.Now.AddYears(-25),
            Address = new AddressDto("Hauptstraße 2", "Linz", 4020)
        };
}
