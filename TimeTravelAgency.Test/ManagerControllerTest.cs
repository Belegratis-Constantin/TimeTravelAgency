using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using SQLitePCL;
using TimeTravelAgency.Application.Cmd;
using TimeTravelAgency.Application.Dto;
using TimeTravelAgency.Application.Infrastructure;
using Xunit;

namespace TimeTravelAgency.Test;

public class ManagerControllerTests
{
    private TimeTravelAgencyContext _context =
        new TimeTravelAgencyContext(new DbContextOptions<TimeTravelAgencyContext>());

    private const string BaseUrl = "http://localhost:5000/api/manager";
    private const string TripBaseUrl = "http://localhost:5000/api/trip";

    [Fact]
    public async Task PostManager_ReturnsCreated()
    {
        var client = new HttpClient();
        var cmd = CreateValidManagerCmd();

        var response = await client.PostAsJsonAsync(BaseUrl, cmd);
        var dto = await response.Content.ReadFromJsonAsync<ManagerDto>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(dto);
        Assert.Equal(cmd.Firstname, dto.firstname);
    }

    [Theory]
    [InlineData(null, "Doe", "a@b.com", "123", "Street", "City", 1010)]
    [InlineData("John", null, "a@b.com", "123", "Street", "City", 1010)]
    [InlineData("John", "Doe", null, "123", "Street", "City", 1010)]
    public async Task PostManager_WithInvalidData_ReturnsBadRequest(
        string firstname, string lastname, string email, string phone, string street, string city, int zip)
    {
        var client = new HttpClient();
        var cmd = new CreateManagerCmd
        {
            Firstname = firstname,
            Lastname = lastname,
            Email = email,
            PhoneNumber = phone,
            Address = new AddressDto(street, city, zip)
        };

        var response = await client.PostAsJsonAsync(BaseUrl, cmd);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetAllManagers_ReturnsOk()
    {
        var client = new HttpClient();
        var response = await client.GetAsync(BaseUrl);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetByGuid_ReturnsOkOrNotFound()
    {
        var client = new HttpClient();

        var createResponse = await client.PostAsJsonAsync(BaseUrl, CreateValidManagerCmd());
        var createdManager = await createResponse.Content.ReadFromJsonAsync<ManagerDto>();

        var getResponse = await client.GetAsync($"{BaseUrl}/{createdManager.guid}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var notFoundResponse = await client.GetAsync($"{BaseUrl}/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, notFoundResponse.StatusCode);
    }

    [Fact]
    public async Task PatchManager_UpdatesFieldsOrReturnsNotFound()
    {
        var client = new HttpClient();
        var createResponse = await client.PostAsJsonAsync(BaseUrl, CreateValidManagerCmd());
        var createdManager = await createResponse.Content.ReadFromJsonAsync<ManagerDto>();

        var updateCmd = new UpdateManagerCmd
        {
            Firstname = "Updated",
            Lastname = "User",
        };

        var patchResponse = await client.PatchAsJsonAsync($"{BaseUrl}/{createdManager.guid}", updateCmd);
        var updatedDto = await patchResponse.Content.ReadFromJsonAsync<ManagerDto>();

        Assert.Equal(HttpStatusCode.OK, patchResponse.StatusCode);
        Assert.Equal("Updated", updatedDto.firstname);

        var notFound = await client.PatchAsJsonAsync($"{BaseUrl}/{Guid.NewGuid()}", updateCmd);
        Assert.Equal(HttpStatusCode.NotFound, notFound.StatusCode);
    }

    [Fact]
    public async Task DeleteManager_DeletesSuccessfullyOrReturnsError()
    {
        var client = new HttpClient();
        var createResponse = await client.PostAsJsonAsync(BaseUrl, CreateValidManagerCmd());
        var createdManager = await createResponse.Content.ReadFromJsonAsync<ManagerDto>();

        var deleteResponse = await client.DeleteAsync($"{BaseUrl}/{createdManager.guid}");
        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

        var deleteAgainResponse = await client.DeleteAsync($"{BaseUrl}/{createdManager.guid}");
        Assert.Equal(HttpStatusCode.NotFound, deleteAgainResponse.StatusCode);
    }

    [Fact]
public async Task CreateTripByManager_UsingFirstLicensedAgent_ReturnsOkOrBadRequest()
{
    var client = new HttpClient();

    var managerResponse = await client.GetAsync(BaseUrl);
    managerResponse.EnsureSuccessStatusCode();
    var managers = await managerResponse.Content.ReadFromJsonAsync<List<ManagerDto>>();
    var manager = managers?.FirstOrDefault();
    Assert.NotNull(manager);

    var agentsResponse = await client.GetAsync($"{BaseUrl}/get-agents-assigned-to-manager/{manager.guid}");
    agentsResponse.EnsureSuccessStatusCode();
    var agents = await agentsResponse.Content.ReadFromJsonAsync<List<AgentDto>>();
    
    var licensedAgent = agents?.FirstOrDefault(a => a.agentType == "LicensedAgent");
    Assert.NotNull(licensedAgent);

    var tripCmd = new
    {
        LicensedAgentGuid = licensedAgent.guid,
        DateInRealLife = DateTime.UtcNow,
        TripName = "Testreise"
    };

    var tripResponse = await client.PostAsJsonAsync($"{BaseUrl}/create-trip/{manager.guid}", tripCmd);
    Assert.Equal(HttpStatusCode.OK, tripResponse.StatusCode);

    var badResponse = await client.PostAsJsonAsync($"{BaseUrl}/create-trip/{Guid.NewGuid()}", tripCmd);
    Assert.Equal(HttpStatusCode.BadRequest, badResponse.StatusCode);
}


    [Fact]
    public async Task GetAgentsAssignedToManager_ReturnsAgentsOrNotFound()
    {
        var client = new HttpClient();
        var managerResponse = await client.PostAsJsonAsync(BaseUrl, CreateValidManagerCmd());
        var manager = await managerResponse.Content.ReadFromJsonAsync<ManagerDto>();

        var response = await client.GetAsync($"{BaseUrl}/get-agents-assigned-to-manager/{manager.guid}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var notFound = await client.GetAsync($"{BaseUrl}/get-agents-assigned-to-manager/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, notFound.StatusCode);
    }

    [Fact]
    public async Task AssignAgentToTrip_ReturnsOkOrBadRequest_UsingExistingData()
    {
        var client = new HttpClient();
        var managers = await client.GetFromJsonAsync<List<ManagerWithIdDto>>($"{BaseUrl}/with-id");
        var manager = managers.FirstOrDefault();
        Assert.NotNull(manager);


        var allAgentsResponse = await client.GetAsync("http://localhost:5000/api/agent");
        allAgentsResponse.EnsureSuccessStatusCode();
        var allAgents = await allAgentsResponse.Content.ReadFromJsonAsync<List<AgentDto>>();

        var agent = allAgents?.FirstOrDefault(a => a.managerId == manager.id);
        Assert.NotNull(agent);

        var tripsResponse = await client.GetAsync("http://localhost:5000/api/trip");
        tripsResponse.EnsureSuccessStatusCode();
        var allTrips = await tripsResponse.Content.ReadFromJsonAsync<List<TripDto>>();

        var trip = allTrips?.FirstOrDefault(t => t.ManagerId == manager.id);
        Assert.NotNull(trip);

        var assignResponse = await client.PatchAsync(
            $"{BaseUrl}/assign-agent-to-trip/{manager.guid}/{agent.guid}/{trip.Guid}", null);
        Assert.Equal(HttpStatusCode.OK, assignResponse.StatusCode);

        var badAssign = await client.PatchAsync(
            $"{BaseUrl}/assign-agent-to-trip/{Guid.NewGuid()}/{Guid.NewGuid()}/{Guid.NewGuid()}", null);
        Assert.Equal(HttpStatusCode.BadRequest, badAssign.StatusCode);
    }


    private static CreateManagerCmd CreateValidManagerCmd() =>
        new CreateManagerCmd
        {
            Firstname = "Max",
            Lastname = "Mustermann",
            Email = "max@example.com",
            PhoneNumber = "123456789",
            Address = new AddressDto("Teststraße 1", "Wien", 1010)
        };
}