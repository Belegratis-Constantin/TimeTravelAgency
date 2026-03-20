using System.Net;
using System.Net.Http.Json;
using TimeTravelAgency.Application.Cmd;
using TimeTravelAgency.Application.Dto;
using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Test;

public class CustomerControllerTests
{
    private const string BaseUrl = "http://localhost:5000/api/customer";

    [Fact]
    public async Task CreateCustomer_ReturnsCreated()
    {
        var client = new HttpClient();
        var cmd = CreateValidCustomerCmd();

        var response = await client.PostAsJsonAsync(BaseUrl, cmd);
        var dto = await response.Content.ReadFromJsonAsync<CustomerDto>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(dto);
        Assert.Equal(cmd.Firstname, dto.firstname);
        Assert.Equal(cmd.Lastname, dto.lastname);
        Assert.Equal(cmd.Email, dto.email);
    }

    [Theory]
    [InlineData(null, "Doe", "a@b.com", "123", "Street", "City", 1010)]
    [InlineData("John", null, "a@b.com", "123", "Street", "City", 1010)]
    [InlineData("John", "Doe", null, "123", "Street", "City", 1010)]
    public async Task CreateCustomer_WithInvalidData_ReturnsBadRequest(
        string firstname, string lastname, string email, string phone, string street, string city, int zip)
    {
        var client = new HttpClient();
        var cmd = new CreateCustomerCmd
        {
            Firstname = firstname,
            Lastname = lastname,
            Email = email,
            PhoneNumber = phone,
            DateOfBirth = DateTime.Now.AddYears(-20),
            Address = new AddressDto(street, city, zip)
        };

        var response = await client.PostAsJsonAsync(BaseUrl, cmd);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
    
    [Fact]
    public async Task GetAllCustomers_ReturnsOk()
    {
        var client = new HttpClient();
        var response = await client.GetAsync(BaseUrl);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var customers = await response.Content.ReadFromJsonAsync<List<CustomerDto>>();
        Assert.NotNull(customers);
    }

    [Fact]
    public async Task GetByGuid_ReturnsOkOrNotFound()
    {
        var client = new HttpClient();

        var createResponse = await client.PostAsJsonAsync(BaseUrl, CreateValidCustomerCmd());
        var createdCustomer = await createResponse.Content.ReadFromJsonAsync<CustomerDto>();

        var getResponse = await client.GetAsync($"{BaseUrl}/{createdCustomer.guid}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var notFoundResponse = await client.GetAsync($"{BaseUrl}/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, notFoundResponse.StatusCode);
    }

    private static CreateCustomerCmd CreateValidCustomerCmd() =>
        new CreateCustomerCmd
        {
            Firstname = "Anna",
            Lastname = "Musterfrau",
            Email = "anna@example.com",
            PhoneNumber = "+9876543215647",
            DateOfBirth = DateTime.Now.AddYears(-25),
            Address = new AddressDto("Hauptstraße 2", "Linz", 4020)
        };
}
