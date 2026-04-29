using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
    
namespace AsyncAwait
{
    public class MyClass
    {
        async Task<int> DoSomethingAsync()
        {
            int result = 0;

            // Simulate an asynchronous operation
            await Task.Delay(1000);

            result = 42;

            return result;
        }

        public async Task Main()
        {
            Console.WriteLine("Starting...");

            int value = await DoSomethingAsync();

            Console.WriteLine($"Result: {value}");

            Console.WriteLine("Done.");
        }

    }
}
