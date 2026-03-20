using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeTravelAgency.Application.Dto;
using TimeTravelAgency.Application.Infrastructure;
using TimeTravelAgency.Application.Model;
using TimeTravelAgency.Application.Service;

namespace TimeTravelAgency.Application.Controller;

[ApiController]
[Route("api/[controller]")]
public class TripController : ControllerBase
{
    private readonly TimeTravelAgencyContext _context;
    private readonly TripService _tripService;

    public TripController(TimeTravelAgencyContext context)
    {
        _context = context;
        _tripService = new TripService(context);
    }
    
    [HttpPost("{tripGuid}/book/{customerGuid}")]
    public IActionResult BookTrip(Guid tripGuid, Guid customerGuid)
    {
        try
        {
            _tripService.TryBookTrip(customerGuid, tripGuid);
            return Ok("Trip successfully booked.");
        }
        catch (ArgumentException ex)
        {
            return Problem(ex.Message, statusCode: 400);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(ex.Message, statusCode: 409);
        }
    }
    
    [HttpGet]
    public async Task<ActionResult<List<TripDto>>> GetAllTrips()
    {
        var trips = await _context.Trips
            .Include(t => t.Paradoxes)
            .Include(t => t.Reports)
            .Include(t => t.Reviews)
            .Include(t => t.Customers)
            .ThenInclude(c => c.Address)
            .Include(t => t.Customers)
            .ThenInclude(c => c.Reviews)
            .ToListAsync();

        var tripsDto = trips.Select(trip => new TripDto
        (
            trip.Guid,
            trip.DateInRealLife,
            trip.TripName,
            trip.TripType,
            trip.TripStatus.ToString(),
            trip.LicensedAgentId,
            trip.ManagerId,
            trip.Paradoxes.Select(p => new ParadoxDto(
                p.Guid,
                p.ParadoxStatus,
                p.ParadoxType)).ToList(),
            trip.Customers.Select(c => new CustomerDto(
                c.Guid,
                c.Firstname,
                c.Lastname,
                c.Email,
                c.PhoneNumber,
                c.DateOfBirth,
                new AddressDto(
                    c.Address.Street,
                    c.Address.City,
                    c.Address.Zip),
                c.Reviews.Select(r => new ReviewDto(
                    r.Guid,
                    r.Stars,
                    r.Header,
                    r.Content)).ToList()
            )).ToList(),
            trip.Reports.Select(r => new ReportForTripDto(
                r.Guid,
                r.Header,
                r.Date,
                r.Content)).ToList(),
            trip.Reviews.Select(r => new ReviewDto(
                r.Guid,
                r.Stars,
                r.Header,
                r.Content)).ToList(), trip.AgentId)).ToList();

        return Ok(tripsDto);
    }


    [HttpGet("{guid}")]
    public async Task<ActionResult<TripDto>> GetTripByGuid(Guid guid)
    {
        var trip = await _context.Trips
            .Include(t => t.Agent)
            .Include(t => t.Manager)
            .Include(t => t.Customers)
            .ThenInclude(c => c.Address)
            .Include(t => t.Customers)
            .ThenInclude(c => c.Reviews)
            .Include(t => t.Paradoxes)
            .Include(t => t.Reports)
            .Include(t => t.Reviews)
            .FirstOrDefaultAsync(t => t.Guid == guid);

        if (trip == null)
            return Problem("Trip not found", statusCode: 404);

        var tripDto = new TripDto
        (
            trip.Guid,
            trip.DateInRealLife,
            trip.TripName,
            trip.TripType,
            trip.TripStatus.ToString(),
            trip.LicensedAgentId,
            trip.ManagerId,
            trip.Paradoxes.Select(p => new ParadoxDto(
                p.Guid,
                p.ParadoxStatus,
                p.ParadoxType)).ToList(),
            trip.Customers.Select(c => new CustomerDto(
                c.Guid,
                c.Firstname,
                c.Lastname,
                c.Email,
                c.PhoneNumber,
                c.DateOfBirth,
                new AddressDto(
                    c.Address.Street,
                    c.Address.City,
                    c.Address.Zip),
                c.Reviews.Select(r => new ReviewDto(
                    r.Guid,
                    r.Stars,
                    r.Header,
                    r.Content)).ToList()
            )).ToList(),
            trip.Reports.Select(r => new ReportForTripDto(
                r.Guid,
                r.Header,
                r.Date,
                r.Content)).ToList(),
            trip.Reviews.Select(r => new ReviewDto(
                r.Guid,
                r.Stars,
                r.Header,
                r.Content)).ToList(), trip.AgentId);

        return Ok(tripDto);
    }
    
    [HttpGet("upcoming")]
    public ActionResult<List<TripDto>> GetUpcomingTrips([FromQuery] bool sorted = true)
    {
        var trips = _tripService.GetUpcomingTrips(sorted);
        return Ok(trips);
    }
}